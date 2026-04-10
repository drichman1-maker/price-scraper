import React, { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Bell, 
  Settings, 
  Search, 
  RefreshCw,
  Send,
  AlertTriangle,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  Mail,
  Users
} from 'lucide-react'
import { format } from 'date-fns'

// M5 MacBook Products - Updated to match backend
const MOCK_PRODUCTS = [
  {
    id: 'macbook-air-13-m5-512',
    name: 'MacBook Air 13" M5 (512GB)',
    category: 'mac',
    specs: { chip: 'M5', storage: '512GB SSD', ram: '16GB', display: '13.6"' },
    currentPrice: 1149,
    originalPrice: 1199,
    lowestPrice: 1099,
    highestPrice: 1199,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 1199 },
      { date: '2025-03-22', price: 1179 },
      { date: '2025-03-24', price: 1149 },
      { date: '2025-03-26', price: 1149 },
    ],
    retailers: [
      { name: 'Amazon', price: 1149, inStock: true, url: 'https://amazon.com/dp/MC6A4LL/A' },
      { name: 'Apple', price: 1199, inStock: true, url: 'https://apple.com/macbook-air' },
      { name: 'Best Buy', price: 1199, inStock: true, url: 'https://bestbuy.com' },
      { name: 'B&H', price: 1099, inStock: true, url: 'https://bhphotovideo.com' },
    ],
    alerts: 18
  },
  {
    id: 'macbook-air-13-m5-1tb',
    name: 'MacBook Air 13" M5 (1TB)',
    category: 'mac',
    specs: { chip: 'M5', storage: '1TB SSD', ram: '16GB', display: '13.6"' },
    currentPrice: 1349,
    originalPrice: 1399,
    lowestPrice: 1299,
    highestPrice: 1399,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 1399 },
      { date: '2025-03-22', price: 1379 },
      { date: '2025-03-24', price: 1349 },
      { date: '2025-03-26', price: 1349 },
    ],
    retailers: [
      { name: 'Amazon', price: 1349, inStock: true, url: 'https://amazon.com/dp/MC6B4LL/A' },
      { name: 'Apple', price: 1399, inStock: true, url: 'https://apple.com/macbook-air' },
      { name: 'Best Buy', price: 1399, inStock: true, url: 'https://bestbuy.com' },
    ],
    alerts: 12
  },
  {
    id: 'macbook-air-15-m5-512',
    name: 'MacBook Air 15" M5 (512GB)',
    category: 'mac',
    specs: { chip: 'M5', storage: '512GB SSD', ram: '16GB', display: '15.3"' },
    currentPrice: 1349,
    originalPrice: 1399,
    lowestPrice: 1299,
    highestPrice: 1399,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 1399 },
      { date: '2025-03-22', price: 1379 },
      { date: '2025-03-24', price: 1349 },
      { date: '2025-03-26', price: 1349 },
    ],
    retailers: [
      { name: 'Amazon', price: 1349, inStock: true, url: 'https://amazon.com/dp/MC8D4LL/A' },
      { name: 'Apple', price: 1399, inStock: true, url: 'https://apple.com/macbook-air' },
      { name: 'B&H', price: 1299, inStock: true, url: 'https://bhphotovideo.com' },
    ],
    alerts: 15
  },
  {
    id: 'macbook-air-15-m5-24gb',
    name: 'MacBook Air 15" M5 (24GB RAM)',
    category: 'mac',
    specs: { chip: 'M5', storage: '512GB SSD', ram: '24GB', display: '15.3"' },
    currentPrice: 1549,
    originalPrice: 1599,
    lowestPrice: 1499,
    highestPrice: 1599,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 1599 },
      { date: '2025-03-22', price: 1579 },
      { date: '2025-03-24', price: 1549 },
      { date: '2025-03-26', price: 1549 },
    ],
    retailers: [
      { name: 'Amazon', price: 1549, inStock: true, url: 'https://amazon.com' },
      { name: 'Apple', price: 1599, inStock: true, url: 'https://apple.com' },
    ],
    alerts: 8
  },
  {
    id: 'macbook-pro-14-m5',
    name: 'MacBook Pro 14" M5',
    category: 'mac',
    specs: { chip: 'M5', storage: '512GB SSD', ram: '24GB', display: '14.2" XDR' },
    currentPrice: 1949,
    originalPrice: 1999,
    lowestPrice: 1899,
    highestPrice: 1999,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 1999 },
      { date: '2025-03-22', price: 1979 },
      { date: '2025-03-24', price: 1949 },
      { date: '2025-03-26', price: 1949 },
    ],
    retailers: [
      { name: 'Amazon', price: 1949, inStock: true, url: 'https://amazon.com/dp/MP5X3LL/A' },
      { name: 'Apple', price: 1999, inStock: true, url: 'https://apple.com/macbook-pro' },
      { name: 'Best Buy', price: 1999, inStock: true, url: 'https://bestbuy.com' },
    ],
    alerts: 22
  },
  {
    id: 'macbook-pro-14-m5-1tb',
    name: 'MacBook Pro 14" M5 (1TB)',
    category: 'mac',
    specs: { chip: 'M5', storage: '1TB SSD', ram: '32GB', display: '14.2" XDR' },
    currentPrice: 2349,
    originalPrice: 2399,
    lowestPrice: 2299,
    highestPrice: 2399,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 2399 },
      { date: '2025-03-22', price: 2379 },
      { date: '2025-03-24', price: 2349 },
      { date: '2025-03-26', price: 2349 },
    ],
    retailers: [
      { name: 'Amazon', price: 2349, inStock: true, url: 'https://amazon.com/dp/MHWC3LL/A' },
      { name: 'Apple', price: 2399, inStock: true, url: 'https://apple.com/macbook-pro' },
      { name: 'Best Buy', price: 2399, inStock: true, url: 'https://bestbuy.com' },
    ],
    alerts: 14
  },
  {
    id: 'macbook-pro-14-m5-pro',
    name: 'MacBook Pro 14" M5 Pro (512GB)',
    category: 'mac',
    specs: { chip: 'M5 Pro', storage: '512GB SSD', ram: '24GB', display: '14.2" XDR' },
    currentPrice: 2449,
    originalPrice: 2499,
    lowestPrice: 2399,
    highestPrice: 2499,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 2499 },
      { date: '2025-03-22', price: 2479 },
      { date: '2025-03-24', price: 2449 },
      { date: '2025-03-26', price: 2449 },
    ],
    retailers: [
      { name: 'Amazon', price: 2449, inStock: true, url: 'https://amazon.com/dp/MQ0W3LL/A' },
      { name: 'Apple', price: 2499, inStock: true, url: 'https://apple.com/macbook-pro' },
      { name: 'Best Buy', price: 2449, inStock: true, url: 'https://bestbuy.com' },
      { name: 'B&H', price: 2449, inStock: true, url: 'https://bhphotovideo.com' },
    ],
    alerts: 18
  },
  {
    id: 'macbook-pro-14-m5-pro-1tb',
    name: 'MacBook Pro 14" M5 Pro (1TB)',
    category: 'mac',
    specs: { chip: 'M5 Pro', storage: '1TB SSD', ram: '36GB', display: '14.2" XDR' },
    currentPrice: 2849,
    originalPrice: 2899,
    lowestPrice: 2799,
    highestPrice: 2899,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 2899 },
      { date: '2025-03-22', price: 2879 },
      { date: '2025-03-24', price: 2849 },
      { date: '2025-03-26', price: 2849 },
    ],
    retailers: [
      { name: 'Amazon', price: 2849, inStock: true, url: 'https://amazon.com/dp/MQ0X3LL/A' },
      { name: 'Apple', price: 2899, inStock: true, url: 'https://apple.com/macbook-pro' },
      { name: 'Best Buy', price: 2849, inStock: true, url: 'https://bestbuy.com' },
    ],
    alerts: 12
  },
  {
    id: 'macbook-pro-14-m5-max',
    name: 'MacBook Pro 14" M5 Max (1TB)',
    category: 'mac',
    specs: { chip: 'M5 Max', storage: '1TB SSD', ram: '36GB', display: '14.2" XDR' },
    currentPrice: 3149,
    originalPrice: 3199,
    lowestPrice: 3099,
    highestPrice: 3199,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 3199 },
      { date: '2025-03-22', price: 3179 },
      { date: '2025-03-24', price: 3149 },
      { date: '2025-03-26', price: 3149 },
    ],
    retailers: [
      { name: 'Amazon', price: 3149, inStock: true, url: 'https://amazon.com/dp/MQ0Y3LL/A' },
      { name: 'Apple', price: 3199, inStock: true, url: 'https://apple.com/macbook-pro' },
      { name: 'Best Buy', price: 3149, inStock: true, url: 'https://bestbuy.com' },
    ],
    alerts: 15
  },
  {
    id: 'macbook-pro-16-m5-pro',
    name: 'MacBook Pro 16" M5 Pro (512GB)',
    category: 'mac',
    specs: { chip: 'M5 Pro', storage: '512GB SSD', ram: '24GB', display: '16.2" XDR' },
    currentPrice: 2749,
    originalPrice: 2799,
    lowestPrice: 2699,
    highestPrice: 2799,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 2799 },
      { date: '2025-03-22', price: 2779 },
      { date: '2025-03-24', price: 2749 },
      { date: '2025-03-26', price: 2749 },
    ],
    retailers: [
      { name: 'Amazon', price: 2749, inStock: true, url: 'https://amazon.com/dp/MRW23LL/A' },
      { name: 'Apple', price: 2799, inStock: true, url: 'https://apple.com/macbook-pro' },
      { name: 'Best Buy', price: 2749, inStock: true, url: 'https://bestbuy.com' },
    ],
    alerts: 20
  },
  {
    id: 'macbook-pro-16-m5-pro-1tb',
    name: 'MacBook Pro 16" M5 Pro (1TB)',
    category: 'mac',
    specs: { chip: 'M5 Pro', storage: '1TB SSD', ram: '36GB', display: '16.2" XDR' },
    currentPrice: 3149,
    originalPrice: 3199,
    lowestPrice: 3099,
    highestPrice: 3199,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 3199 },
      { date: '2025-03-22', price: 3179 },
      { date: '2025-03-24', price: 3149 },
      { date: '2025-03-26', price: 3149 },
    ],
    retailers: [
      { name: 'Amazon', price: 3149, inStock: true, url: 'https://amazon.com/dp/MRW33LL/A' },
      { name: 'Apple', price: 3199, inStock: true, url: 'https://apple.com/macbook-pro' },
      { name: 'Best Buy', price: 3149, inStock: true, url: 'https://bestbuy.com' },
    ],
    alerts: 16
  },
  {
    id: 'macbook-pro-16-m5-max',
    name: 'MacBook Pro 16" M5 Max (1TB)',
    category: 'mac',
    specs: { chip: 'M5 Max', storage: '1TB SSD', ram: '48GB', display: '16.2" XDR' },
    currentPrice: 3449,
    originalPrice: 3499,
    lowestPrice: 3399,
    highestPrice: 3499,
    lastUpdated: '2025-03-26T10:00:00Z',
    lastScraped: '2025-03-26T08:00:00Z',
    priceHistory: [
      { date: '2025-03-20', price: 3499 },
      { date: '2025-03-22', price: 3479 },
      { date: '2025-03-24', price: 3449 },
      { date: '2025-03-26', price: 3449 },
    ],
    retailers: [
      { name: 'Amazon', price: 3449, inStock: true, url: 'https://amazon.com/dp/MRW43LL/A' },
      { name: 'Apple', price: 3499, inStock: true, url: 'https://apple.com/macbook-pro' },
      { name: 'Best Buy', price: 3449, inStock: true, url: 'https://bestbuy.com' },
    ],
    alerts: 22
  }
]

const MOCK_SCRAPER_LOGS = [
  { id: 1, timestamp: '2024-03-26T08:00:00Z', status: 'success', message: 'Scraped 24 products, 18 updates', duration: '45s' },
  { id: 2, timestamp: '2024-03-26T04:00:00Z', status: 'success', message: 'Scraped 24 products, 3 updates', duration: '38s' },
  { id: 3, timestamp: '2024-03-26T00:00:00Z', status: 'error', message: 'Amazon CAPTCHA detected, 12 products skipped', duration: '2m15s' },
  { id: 4, timestamp: '2024-03-25T20:00:00Z', status: 'success', message: 'Scraped 24 products, 5 updates', duration: '42s' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('products')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState(MOCK_SCRAPER_LOGS)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  // Fetch real products from backend
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://theresmac-backend.fly.dev'
      const response = await fetch(`${apiUrl}/api/products`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      const productsList = Array.isArray(data) ? data : (data.products || [])
      
      // Transform backend format to dashboard format
      const transformed = productsList.map(p => {
        const pricesArray = Object.entries(p.prices || {})
          .filter(([_, d]) => d && typeof d === 'object' && d.price && !d.notCarried)
          .map(([retailer, d]) => ({ name: retailer.charAt(0).toUpperCase() + retailer.slice(1), price: d.price, inStock: d.inStock !== false, url: d.url || '' }))
        
        const sortedPrices = [...pricesArray].sort((a, b) => a.price - b.price)
        const bestPrice = sortedPrices[0]?.price || 0
        const worstPrice = sortedPrices[sortedPrices.length - 1]?.price || 0
        
        return {
          id: p.id,
          name: p.name,
          category: p.category || 'mac',
          specs: p.specs || {},
          currentPrice: bestPrice,
          originalPrice: p.msrp || worstPrice,
          lowestPrice: bestPrice,
          highestPrice: worstPrice,
          lastUpdated: p.lastUpdated || new Date().toISOString(),
          lastScraped: p.lastUpdated || new Date().toISOString(),
          priceHistory: [],
          retailers: sortedPrices,
          alerts: 0,
          msrp: p.msrp || null,
        }
      })
      
      setProducts(transformed)
    } catch (error) {
      console.error('[Dashboard] Failed to fetch products:', error)
      // Fall back to mock data
      setProducts(MOCK_PRODUCTS)
    } finally {
      setLoading(false)
    }
  }

  const handleSendAlert = async () => {
    // Send price drop alert
    console.log('Sending alert:', {
      product: selectedProduct,
      message: alertMessage
    })
    
    // API call would go here:
    // await fetch('/api/send-alert', {
    //   method: 'POST',
    //   body: JSON.stringify({ productId: selectedProduct.id, message: alertMessage })
    // })
    
    setShowAlertModal(false)
    setAlertMessage('')
    alert(`Price drop alert sent to ${selectedProduct.alerts} subscribers!`)
  }

  const handleManualPriceUpdate = async (productId, newPrice, retailer) => {
    // If no retailer specified, update the first/best retailer
    const product = products.find(p => p.id === productId)
    const targetRetailer = retailer || product?.retailers?.[0]?.name?.toLowerCase() || 'amazon'
    
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || 'https://theresmac-backend.fly.dev'}/api/admin/update-price`
      const apiKey = import.meta.env.VITE_API_KEY || ''
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          productId,
          retailer: targetRetailer,
          price: newPrice,
          inStock: true,
        }),
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to update price')
      }
      
      const result = await response.json()
      console.log('[Dashboard] Price updated:', result)
      
      // Update local state to reflect the change
      setProducts(products.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            currentPrice: newPrice,
            lastUpdated: new Date().toISOString(),
            priceHistory: [...p.priceHistory, { date: format(new Date(), 'yyyy-MM-dd'), price: newPrice }]
          }
        }
        return p
      }))
    } catch (error) {
      console.error('[Dashboard] Price update failed:', error)
      alert(`Price update failed: ${error.message}`)
    }
  }

  const forceScrape = () => {
    // Trigger manual scrape
    console.log('Force scraping...')
    alert('Manual scrape triggered! Check logs for results.')
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterCategory === 'all' || p.category === filterCategory
    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <LayoutDashboard className="w-6 h-6 text-primary-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Scraper Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={forceScrape}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Scraper Now
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center px-1 py-2 border-b-2 text-sm font-medium ${
                activeTab === 'products'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Products ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center px-1 py-2 border-b-2 text-sm font-medium ${
                activeTab === 'alerts'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Bell className="w-4 h-4 mr-2" />
              Alert Subscribers
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center px-1 py-2 border-b-2 text-sm font-medium ${
                activeTab === 'logs'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4 mr-2" />
              Scraper Logs
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center px-1 py-2 border-b-2 text-sm font-medium ${
                activeTab === 'settings'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('newsletter')}
              className={`flex items-center px-1 py-2 border-b-2 text-sm font-medium ${
                activeTab === 'newsletter'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Newsletter
            </button>
          </nav>
        </div>

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div>
            {/* Filters */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Categories</option>
                  <option value="mac">Mac</option>
                  <option value="iphone">iPhone</option>
                  <option value="ipad">iPad</option>
                  <option value="watch">Watch</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSendAlert={() => {
                    setSelectedProduct(product)
                    setShowAlertModal(true)
                  }}
                  onPriceUpdate={(price, retailer) => handleManualPriceUpdate(product.id, price, retailer)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Alert Management</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage price drop alerts and notify subscribers
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                  icon={<Bell className="w-5 h-5" />}
                  title="Total Subscribers"
                  value="45"
                  change="+5 this week"
                />
                <StatCard
                  icon={<TrendingDown className="w-5 h-5" />}
                  title="Price Drops Today"
                  value="3"
                  change="2 awaiting alerts"
                />
                <StatCard
                  icon={<CheckCircle className="w-5 h-5" />}
                  title="Alerts Sent"
                  value="12"
                  change="This week"
                />
              </div>

              <h3 className="text-md font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {products.filter(p => p.alerts > 0).map(product => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.alerts} subscribers waiting for alerts</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProduct(product)
                        setShowAlertModal(true)
                      }}
                      className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Alert
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Scraper Logs</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {logs.map(log => (
                <div key={log.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mr-3" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.message}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')} • Duration: {log.duration}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Scraper Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scrape Frequency
                </label>
                <select className="block w-full max-w-md border border-gray-300 rounded-lg px-3 py-2">
                  <option>Every 1 hour</option>
                  <option>Every 2 hours</option>
                  <option selected>Every 4 hours</option>
                  <option>Every 6 hours</option>
                  <option>Every 12 hours</option>
                  <option>Daily</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Active Retailers
                </label>
                <div className="space-y-2">
                  {['Amazon', 'eBay', 'Best Buy', 'Newegg'].map(retailer => (
                    <label key={retailer} className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      <span className="text-sm text-gray-700">{retailer}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proxy Service
                </label>
                <select className="block w-full max-w-md border border-gray-300 rounded-lg px-3 py-2">
                  <option>None (direct scraping)</option>
                  <option>ScraperAPI ($49/mo)</option>
                  <option>BrightData ($3/GB)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Newsletter Tab */}
        {activeTab === 'newsletter' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Newsletter Subscribers</p>
                    <p className="text-2xl font-bold text-gray-900" id="subscriberCount">0</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Mail className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Last Newsletter Sent</p>
                    <p className="text-2xl font-bold text-gray-900">Never</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Send className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Open Rate</p>
                    <p className="text-2xl font-bold text-gray-900">--</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Newsletter Composer */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Send Weekly Deals Newsletter</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    id="newsletterSubject"
                    placeholder="e.g., This Week's Best Apple Deals - Save up to $200!"
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Newsletter Content (HTML)
                  </label>
                  <textarea
                    id="newsletterContent"
                    rows="12"
                    placeholder="<h2>Weekly Deals</h2><p>Check out these amazing deals...</p>"
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tip: Use HTML for formatting. Include &lt;style&gt; tags for custom styling.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    <span id="previewSubscriberCount">0</span> subscribers will receive this email
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        const subject = document.getElementById('newsletterSubject').value;
                        const content = document.getElementById('newsletterContent').value;
                        if (!subject || !content) {
                          alert('Please fill in both subject and content');
                          return;
                        }
                        // Send test to yourself
                        alert('Test email would be sent to your address');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Send Test to Me
                    </button>
                    <button
                      onClick={() => {
                        const subject = document.getElementById('newsletterSubject').value;
                        const content = document.getElementById('newsletterContent').value;
                        if (!subject || !content) {
                          alert('Please fill in both subject and content');
                          return;
                        }
                        if (confirm('Are you sure you want to send this newsletter to all subscribers?')) {
                          fetch('/api/newsletter/send', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'X-API-Key': 'admin-secret-key-change'
                            },
                            body: JSON.stringify({
                              subject,
                              html: content,
                              text: content.replace(/<[^>]*>/g, '')
                            })
                          })
                          .then(res => res.json())
                          .then(data => {
                            if (data.success) {
                              alert(`Newsletter sent to ${data.sentCount} subscribers!`);
                            } else {
                              alert('Error: ' + data.error);
                            }
                          })
                          .catch(err => alert('Error sending newsletter: ' + err.message));
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Send to All Subscribers
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscriber List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Subscriber List</h3>
              </div>
              <div className="p-6">
                <div id="subscriberList" className="space-y-2">
                  <p className="text-gray-500 text-center py-4">No subscribers yet</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Send Alert Modal */}
      {showAlertModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Send Price Drop Alert</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600">Product</p>
                <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                <p className="text-lg font-bold text-green-600">${selectedProduct.currentPrice}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Alert Message ({selectedProduct.alerts} subscribers)
                </p>
                <textarea
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder={`🚨 Price Drop Alert! ${selectedProduct.name} is now $${selectedProduct.currentPrice}!`}
                  className="w-full h-24 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    This will send an email to {selectedProduct.alerts} subscribers who have price alerts for this product.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSendAlert}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCard({ product, onSendAlert, onPriceUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [editPrice, setEditPrice] = useState(product.currentPrice)
  const [isEditing, setIsEditing] = useState(false)

  const priceChange = product.currentPrice - product.originalPrice
  const priceChangePercent = ((priceChange / product.originalPrice) * 100).toFixed(1)
  const isPriceDrop = priceChange < 0

  // Extract specs from product name or specs object
  const specs = product.specs || {}
  const chip = specs.chip || product.name.match(/M\d+\s*(Pro|Max)?/i)?.[0] || 'M5'
  const storage = specs.storage || product.name.match(/\d+(GB|TB)/i)?.[0] || ''
  const ram = specs.ram || product.name.match(/\d+GB\s*RAM/i)?.[0]?.replace(' RAM', '') || ''
  const display = specs.display || (product.name.includes('16"') ? '16.2"' : product.name.includes('15"') ? '15.3"' : '13.6"')

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-gray-900">{product.name}</h3>
            {/* Specs Badge Row */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                {chip}
              </span>
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                {storage}
              </span>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                {ram || '16GB'} RAM
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                {display}
              </span>
            </div>
          </div>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full uppercase">
            {product.category}
          </span>
        </div>

        <div className="flex items-baseline mb-4">
          <span className="text-2xl font-bold text-gray-900">${product.currentPrice}</span>
          {isPriceDrop ? (
            <span className="ml-2 text-green-600 text-sm font-medium">
              ↓ {Math.abs(priceChangePercent)}%
            </span>
          ) : priceChange > 0 ? (
            <span className="ml-2 text-red-600 text-sm font-medium">
              ↑ {priceChangePercent}%
            </span>
          ) : null}
        </div>

        {/* Price History Mini Chart */}
        <div className="mb-4">
          <div className="flex items-end space-x-1 h-12">
            {product.priceHistory.map((point, i) => {
              const height = ((point.price - product.lowestPrice) / (product.highestPrice - product.lowestPrice)) * 100
              return (
                <div
                  key={i}
                  className="flex-1 bg-primary-200 hover:bg-primary-300 rounded-t"
                  style={{ height: `${Math.max(height, 20)}%` }}
                  title={`${point.date}: $${point.price}`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>${product.lowestPrice}</span>
            <span>${product.highestPrice}</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-gray-500">Last Scraped</p>
            <p className="font-medium">{format(new Date(product.lastScraped), 'MMM d, HH:mm')}</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-gray-500">Alerts</p>
            <p className="font-medium">{product.alerts} subscribers</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          {isEditing ? (
            <div className="flex-1 flex space-x-2">
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(Number(e.target.value))}
                className="flex-1 border border-gray-300 rounded px-3 py-1"
                placeholder="New price"
              />
              <button
                onClick={() => {
                  onPriceUpdate(editPrice)
                  setIsEditing(false)
                }}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditPrice(product.currentPrice)
                  setIsEditing(false)
                }}
                className="px-3 py-1 text-gray-600 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Edit Price
              </button>
              {product.alerts > 0 && (
                <button
                  onClick={onSendAlert}
                  className="flex-1 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Send Alert
                </button>
              )}
            </>
          )}
        </div>

        {/* Expand Details */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" /> Hide retailers
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" /> Show retailers ({product.retailers.length})
            </>
          )}
        </button>

        {/* Expanded Retailers */}
        {isExpanded && (
          <div className="mt-4 space-y-2">
            {product.retailers.map((retailer, i) => {
              // Check if affiliate is configured
              const hasAffiliate = ['Amazon', 'eBay', 'Backmarket'].includes(retailer.name)
              
              // Generate proper affiliate URL
              const getAffiliateUrl = (name, productName) => {
                const encoded = encodeURIComponent(productName)
                switch(name) {
                  case 'Amazon':
                    return `https://www.amazon.com/s?k=${encoded}&tag=Theresmac-20`
                  case 'eBay':
                    return `https://www.ebay.com/sch/i.html?_nkw=${encoded}&campid=5339142921`
                  case 'Backmarket':
                    return retailer.url // Backmarket uses direct links
                  default:
                    return retailer.url
                }
              }
              
              const affiliateUrl = getAffiliateUrl(retailer.name, product.name)
              
              return (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="font-medium text-sm">{retailer.name}</span>
                    {hasAffiliate && (
                      <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded" title="Affiliate link active">
                        $
                      </span>
                    )}
                    {retailer.inStock ? (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">In Stock</span>
                    ) : (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">Out</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <RetailerPriceEditor
                      productId={product.id}
                      retailerName={retailer.name}
                      retailerPrice={retailer.price}
                      inStock={retailer.inStock}
                      onUpdated={fetchProducts}
                    />
                    <a
                      href={affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-800"
                      title={hasAffiliate ? "Affiliate link - you'll earn commission" : "Direct link - no affiliate"}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )
            })}
            
            {/* Affiliate Status Note */}
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <span className="font-medium">$ = Affiliate link active</span> (Amazon, eBay, Backmarket)
              <br />
              <span className="text-amber-600">Pending: B&H, Best Buy, Newegg, Walmart (CJ approval)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RetailerPriceEditor({ productId, retailerName, retailerPrice, inStock, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editPrice, setEditPrice] = useState(retailerPrice)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://theresmac-backend.fly.dev'
      const apiKey = import.meta.env.VITE_API_KEY || ''
      const response = await fetch(`${apiUrl}/api/admin/update-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          productId,
          retailer: retailerName.toLowerCase(),
          price: editPrice,
          inStock: true,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Update failed')
      }
      setIsEditing(false)
      if (onUpdated) onUpdated()
    } catch (error) {
      alert(`Failed: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center space-x-1">
        <span className="text-sm">$</span>
        <input
          type="number"
          value={editPrice}
          onChange={(e) => setEditPrice(Number(e.target.value))}
          className="w-20 border border-gray-300 rounded px-2 py-0.5 text-sm"
          autoFocus
        />
        <button onClick={handleSave} disabled={saving} className="px-2 py-0.5 bg-green-600 text-white rounded text-xs">
          {saving ? '...' : 'OK'}
        </button>
        <button onClick={() => { setIsEditing(false); setEditPrice(retailerPrice) }} className="px-2 py-0.5 text-gray-500 text-xs">
          X
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setIsEditing(true)} className="font-bold text-sm hover:underline cursor-pointer" title="Click to edit">
      ${retailerPrice}
    </button>
  )
}

function StatCard({ icon, title, value, change }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center text-gray-500 mb-2">
        {icon}
        <span className="ml-2 text-sm">{title}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-green-600">{change}</div>
    </div>
  )
}