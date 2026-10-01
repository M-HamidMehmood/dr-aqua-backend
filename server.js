require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')

const app = express()
const PORT = process.env.PORT || 10000

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ivfvxnwciuqicqqnlbtx.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZnZ4bndjaXVxaWNxcW5sYnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODU3MDAsImV4cCI6MjA3ODE2MTcwMH0.c-PfjifYWi5_lxK0VGXKRmUo8zhoXHz7NYR4zV6Usmg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint for Render monitoring
app.get('/', async (req, res) => {
  try {
    const { count, error } = await supabase.from('draqua_products').select('*', { count: 'exact', head: true })
    res.json({
      status: 'ok',
      service: 'Dr. Aqua Backend API',
      deployment: 'Render Cloud Web Service',
      database: error ? `Supabase error: ${error.message}` : 'Supabase connected',
      productsCount: count ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
})

app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('draqua_products').select('id').limit(1)
    if (error) throw error
    res.status(200).json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message })
  }
})

// ==========================================
// 1. PRODUCTS API
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('draqua_products').select('*').order('id', { ascending: true })
    if (error) throw error
    const formatted = data.map((r) => ({
      id: Number(r.id),
      sku: r.sku,
      name: r.name,
      urduName: r.urdu_name,
      category: r.category,
      price: Number(r.price),
      quantity: Number(r.quantity),
      onlineVisible: r.online_visible,
      image: r.image,
      description: r.description,
      urduDescription: r.urdu_description,
    }))
    res.json({ success: true, count: formatted.length, products: formatted })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/products', async (req, res) => {
  try {
    const p = req.body
    const payload = {
      id: p.id || Date.now(),
      sku: p.sku || `DA-${Date.now()}`,
      name: p.name,
      urdu_name: p.urduName || null,
      category: p.category || 'General',
      price: p.price,
      quantity: p.quantity ?? 0,
      online_visible: p.onlineVisible !== false,
      image: p.image || null,
      description: p.description || null,
      urdu_description: p.urduDescription || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('draqua_products').upsert(payload).select()
    if (error) throw error
    res.status(201).json({ success: true, product: data[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.patch('/api/products/:id/stock', async (req, res) => {
  try {
    const { id } = req.params
    const { quantity } = req.body
    if (quantity === undefined) {
      return res.status(400).json({ success: false, error: 'quantity field is required' })
    }
    const { data, error } = await supabase
      .from('draqua_products')
      .update({ quantity: Number(quantity), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    res.json({ success: true, updated: data[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ==========================================
// 2. ORDERS API (Web Orders & Counter Invoices)
// ==========================================
app.get('/api/orders', async (req, res) => {
  try {
    const { status } = req.query
    let query = supabase.from('draqua_orders').select('*').order('created_at', { ascending: false })
    if (status && status !== 'All') {
      query = query.eq('status', status)
    }
    const { data, error } = await query
    if (error) throw error
    const formatted = data.map((r) => ({
      id: r.id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      deliveryAddress: r.delivery_address,
      city: r.city,
      items: r.items || [],
      subtotal: Number(r.subtotal),
      deliveryFee: Number(r.delivery_fee),
      total: Number(r.total),
      paymentMethod: r.payment_method,
      paymentStatus: r.payment_status,
      status: r.status,
      courierName: r.courier_name,
      trackingNumber: r.tracking_number,
      notes: r.notes,
      createdAt: r.created_at,
    }))
    res.json({ success: true, count: formatted.length, orders: formatted })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/orders', async (req, res) => {
  try {
    const order = req.body
    const payload = {
      id: order.id || `ORD-${Date.now()}`,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      delivery_address: order.deliveryAddress,
      city: order.city,
      items: order.items || [],
      subtotal: order.subtotal || 0,
      delivery_fee: order.deliveryFee || 0,
      total: order.total,
      payment_method: order.paymentMethod || 'Cash on Delivery',
      payment_status: order.paymentStatus || 'Unpaid (COD)',
      status: order.status || 'Pending',
      courier_name: order.courierName || null,
      tracking_number: order.trackingNumber || null,
      notes: order.notes || null,
      created_at: order.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('draqua_orders').upsert(payload).select()
    if (error) throw error
    res.status(201).json({ success: true, order: data[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status, courierName, trackingNumber, paymentStatus } = req.body
    const updatePayload = { updated_at: new Date().toISOString() }
    if (status) updatePayload.status = status
    if (courierName !== undefined) updatePayload.courier_name = courierName
    if (trackingNumber !== undefined) updatePayload.tracking_number = trackingNumber
    if (paymentStatus !== undefined) updatePayload.payment_status = paymentStatus

    const { data, error } = await supabase.from('draqua_orders').update(updatePayload).eq('id', id).select()
    if (error) throw error
    res.json({ success: true, updated: data[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ==========================================
// 3. CUSTOMERS API
// ==========================================
app.get('/api/customers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('draqua_customers').select('*').order('id', { ascending: false })
    if (error) throw error
    const formatted = data.map((c) => ({
      id: Number(c.id),
      name: c.name,
      contact: c.contact,
      history: c.history || [],
      serviceHistory: c.service_history || [],
    }))
    res.json({ success: true, count: formatted.length, customers: formatted })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/customers', async (req, res) => {
  try {
    const c = req.body
    const payload = {
      id: c.id || Date.now(),
      name: c.name,
      contact: c.contact,
      history: c.history || [],
      service_history: c.serviceHistory || [],
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('draqua_customers').upsert(payload).select()
    if (error) throw error
    res.status(201).json({ success: true, customer: data[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabase.from('draqua_customers').delete().eq('id', id)
    if (error) throw error
    res.json({ success: true, deletedId: id })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ==========================================
// 4. BOOKINGS API (Field Service & Installations)
// ==========================================
app.get('/api/bookings', async (req, res) => {
  try {
    const { data, error } = await supabase.from('draqua_bookings').select('*').order('created_at', { ascending: false })
    if (error) throw error
    const formatted = data.map((b) => ({
      id: b.id,
      customerId: b.customer_id ? Number(b.customer_id) : null,
      customerName: b.customer_name,
      customerContact: b.customer_contact,
      address: b.address,
      city: b.city,
      serviceType: b.service_type,
      scheduledDate: b.scheduled_date,
      timeSlot: b.time_slot,
      technicianName: b.technician_name,
      technicianPhone: b.technician_phone,
      status: b.status,
      partsUsed: b.parts_used || [],
      tdsReadingBefore: b.tds_reading_before,
      tdsReadingAfter: b.tds_reading_after,
      laborFee: Number(b.labor_fee),
      partsTotal: Number(b.parts_total),
      totalCharges: Number(b.total_charges),
      notes: b.notes,
      completedAt: b.completed_at,
    }))
    res.json({ success: true, count: formatted.length, bookings: formatted })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/bookings', async (req, res) => {
  try {
    const b = req.body
    const payload = {
      id: b.id || `BK-${Date.now()}`,
      customer_id: b.customerId || null,
      customer_name: b.customerName,
      customer_contact: b.customerContact,
      address: b.address,
      city: b.city,
      service_type: b.serviceType,
      scheduled_date: b.scheduledDate,
      time_slot: b.timeSlot,
      technician_name: b.technicianName,
      technician_phone: b.technicianPhone || null,
      status: b.status || 'Scheduled',
      parts_used: b.partsUsed || [],
      tds_reading_before: b.tdsReadingBefore || null,
      tds_reading_after: b.tdsReadingAfter || null,
      labor_fee: b.laborFee || 0,
      parts_total: b.partsTotal || 0,
      total_charges: b.totalCharges || 0,
      notes: b.notes || null,
      completed_at: b.completedAt || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('draqua_bookings').upsert(payload).select()
    if (error) throw error
    res.status(201).json({ success: true, booking: data[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.patch('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    const payload = { updated_at: new Date().toISOString() }
    if (updates.status) payload.status = updates.status
    if (updates.partsUsed !== undefined) payload.parts_used = updates.partsUsed
    if (updates.tdsReadingBefore !== undefined) payload.tds_reading_before = updates.tdsReadingBefore
    if (updates.tdsReadingAfter !== undefined) payload.tds_reading_after = updates.tdsReadingAfter
    if (updates.laborFee !== undefined) payload.labor_fee = updates.laborFee
    if (updates.partsTotal !== undefined) payload.parts_total = updates.partsTotal
    if (updates.totalCharges !== undefined) payload.total_charges = updates.totalCharges
    if (updates.notes !== undefined) payload.notes = updates.notes
    if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt

    const { data, error } = await supabase.from('draqua_bookings').update(payload).eq('id', id).select()
    if (error) throw error
    res.json({ success: true, updated: data[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ==========================================
// 5. SALES LEDGER API
// ==========================================
app.get('/api/sales', async (req, res) => {
  try {
    const { data, error } = await supabase.from('draqua_sales').select('*').order('date', { ascending: false })
    if (error) throw error
    res.json({ success: true, count: data.length, sales: data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/sales', async (req, res) => {
  try {
    const s = req.body
    const payload = {
      invoice: s.invoice,
      customer_id: s.customerId || null,
      customer_name: s.customerName || null,
      items: s.items || [],
      subtotal: s.subtotal || null,
      discount: s.discount || 0,
      total: s.total,
      payment_method: s.paymentMethod,
      payment_reference: s.paymentReference || null,
      order_origin: s.orderOrigin || 'POS Counter',
      notes: s.notes || null,
      date: s.date || new Date().toISOString(),
    }
    const { data, error } = await supabase.from('draqua_sales').upsert(payload).select()
    if (error) throw error
    res.status(201).json({ success: true, sale: data[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ==========================================
// 6. MASTER TWO-WAY SYNC RECONCILIATION
// ==========================================
app.post('/api/sync', async (req, res) => {
  try {
    const { inventory, webOrders, customers, bookings, sales } = req.body

    // 1. Sync inventory
    if (inventory && inventory.length > 0) {
      const mappedProducts = inventory.map((p) => ({
        id: p.id,
        sku: p.sku || `DA-${p.id}`,
        name: p.name,
        urdu_name: p.urduName || null,
        category: p.category || 'Filters',
        price: p.price,
        quantity: p.quantity,
        online_visible: p.onlineVisible !== false,
        image: p.image || null,
        description: p.description || null,
        urdu_description: p.urduDescription || null,
        updated_at: new Date().toISOString(),
      }))
      await supabase.from('draqua_products').upsert(mappedProducts)
    }

    // 2. Sync orders
    if (webOrders && webOrders.length > 0) {
      for (const ord of webOrders) {
        await supabase.from('draqua_orders').upsert({
          id: ord.id,
          customer_name: ord.customerName,
          customer_phone: ord.customerPhone,
          delivery_address: ord.deliveryAddress,
          city: ord.city,
          items: ord.items || [],
          subtotal: ord.subtotal || 0,
          delivery_fee: ord.deliveryFee || 0,
          total: ord.total,
          payment_method: ord.paymentMethod,
          payment_status: ord.paymentStatus,
          status: ord.status,
          courier_name: ord.courierName || null,
          tracking_number: ord.trackingNumber || null,
          notes: ord.notes || null,
          created_at: ord.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }

    // 3. Sync customers
    if (customers && customers.length > 0) {
      for (const cust of customers) {
        await supabase.from('draqua_customers').upsert({
          id: cust.id,
          name: cust.name,
          contact: cust.contact,
          history: cust.history || [],
          service_history: cust.serviceHistory || [],
          updated_at: new Date().toISOString(),
        })
      }
    }

    // 4. Sync bookings
    if (bookings && bookings.length > 0) {
      for (const bk of bookings) {
        await supabase.from('draqua_bookings').upsert({
          id: bk.id,
          customer_id: bk.customerId || null,
          customer_name: bk.customerName,
          customer_contact: bk.customerContact,
          address: bk.address,
          city: bk.city,
          service_type: bk.serviceType,
          scheduled_date: bk.scheduledDate,
          time_slot: bk.timeSlot,
          technician_name: bk.technicianName,
          technician_phone: bk.technicianPhone || null,
          status: bk.status,
          parts_used: bk.partsUsed || [],
          tds_reading_before: bk.tdsReadingBefore || null,
          tds_reading_after: bk.tdsReadingAfter || null,
          labor_fee: bk.laborFee || 0,
          parts_total: bk.partsTotal || 0,
          total_charges: bk.totalCharges || 0,
          notes: bk.notes || null,
          completed_at: bk.completedAt || null,
          updated_at: new Date().toISOString(),
        })
      }
    }

    // 5. Sync sales
    if (sales && sales.length > 0) {
      for (const sl of sales) {
        await supabase.from('draqua_sales').upsert({
          invoice: sl.invoice,
          customer_id: sl.customerId || null,
          customer_name: sl.customerName || null,
          items: sl.items || [],
          subtotal: sl.subtotal || null,
          discount: sl.discount || 0,
          total: sl.total,
          payment_method: sl.paymentMethod,
          payment_reference: sl.paymentReference || null,
          order_origin: sl.orderOrigin || 'POS Counter',
          notes: sl.notes || null,
          date: sl.date || new Date().toISOString(),
        })
      }
    }

    // Pull latest orders from Supabase to reconcile
    const { data: latestOrders } = await supabase.from('draqua_orders').select('*').order('created_at', { ascending: false })

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      remoteOrdersCount: latestOrders?.length || 0,
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Dr. Aqua Backend API] Running on port ${PORT}`)
    console.log(`[Supabase Connection] Connected to ${SUPABASE_URL}`)
  })
}

module.exports = app
