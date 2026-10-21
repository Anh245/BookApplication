import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ShoppingCart,
  User,
  LogOut,
  Home,
  BookOpen,
  ClipboardList,
  Search,
  Sparkles,
  ShieldCheck,
  Truck,
  RotateCcw,
  Moon,
  Sun,
} from 'lucide-react';
import { SearchInput, Button, ErrorBoundary, IconButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast, ToastProvider } from '../context/ToastContext';
import { ToastContainer } from '../components/common/Toast';
import { useDarkMode } from '../hooks';
import ChatWidget from '../components/features/ChatWidget/ChatWidget';

/**
 * CustomerLayout: Layout chuẩn Responsive cao cấp cho khách hàng
 * Hỗ trợ giao diện máy tính & tối ưu thao tác ngón tay trên điện thoại
 */
const CustomerLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const { isDark, toggleDarkMode } = useDarkMode();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleSearch = (query) => {
    if (query && query.trim()) {
      navigate(`/books?q=${encodeURIComponent(query.trim())}`);
      setMobileSearchOpen(false);
    }
  };

  const isNavActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans antialiased">
        {/* Top Announcement Bar */}
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 text-white text-xs font-medium py-1.5 px-4 text-center tracking-wide">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <Sparkles size={14} className="animate-spin text-amber-300" />
            <span>Chào mừng bạn đến với <strong>Phương Anh Bookstore</strong> – Freeship đơn từ 250k & Gợi ý sách AI thông minh!</span>
          </div>
        </div>

        {/* Sticky Header */}
        <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 transition-shadow duration-200">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">

              {/* Logo */}
              <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                  <span className="text-white font-extrabold text-xl font-heading">P</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Phương Anh
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400 tracking-wider hidden xs:inline">
                    Bookstore
                  </span>
                </div>
              </Link>

              {/* Desktop Search Bar */}
              <div className="hidden md:block flex-1 max-w-md lg:max-w-lg mx-2 lg:mx-6">
                <SearchInput
                  placeholder="Tìm kiếm sách theo tên, tác giả, thể loại..."
                  value=""
                  onChange={handleSearch}
                />
              </div>

              {/* Right Action Icons & Menu */}
              <div className="flex items-center gap-1 sm:gap-3">
                {/* Dark Mode Toggle */}
                <IconButton
                  icon={isDark ? Sun : Moon}
                  onClick={toggleDarkMode}
                  variant="ghost"
                  aria-label={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
                />

                {/* Mobile Search Toggle Icon */}
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                  className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  aria-label="Tìm kiếm"
                >
                  <Search size={21} />
                </button>

                {/* Desktop Link: Sách */}
                <Link
                  to="/books"
                  className={`hidden md:inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold transition ${isNavActive('/books')
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
                    : 'text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  Kho sách
                </Link>

                {/* Cart Icon (Always visible on all screen sizes) */}
                <Link
                  to="/cart"
                  className="relative p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:text-indigo-600 hover:bg-indigo-50/60 dark:hover:bg-gray-800 transition flex items-center"
                  aria-label="Giỏ hàng"
                >
                  <ShoppingCart size={22} />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[11px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shadow-md animate-bounce">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </Link>

                {/* Desktop User Menu / Auth Buttons */}
                <div className="hidden md:flex items-center gap-2">
                  {isAuthenticated ? (
                    <div className="relative group">
                      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                          {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User size={16} />}
                        </div>
                        <span className="text-sm font-medium max-w-[120px] truncate">
                          {user?.full_name || 'Tài khoản'}
                        </span>
                      </button>

                      {/* Dropdown menu */}
                      <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100 dark:border-gray-800 py-1.5 z-50">
                        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                          <p className="text-xs text-gray-500">Đăng nhập với</p>
                          <p className="text-sm font-semibold truncate text-gray-800 dark:text-gray-200">{user?.full_name}</p>
                        </div>
                        <Link
                          to="/profile"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800 transition"
                        >
                          <User size={16} />
                          Hồ sơ cá nhân
                        </Link>
                        <Link
                          to="/orders"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800 transition"
                        >
                          <ClipboardList size={16} />
                          Đơn hàng của tôi
                        </Link>
                        <button
                          onClick={() => {
                            logout();
                            navigate('/');
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-t border-gray-100 dark:border-gray-800 transition"
                        >
                          <LogOut size={16} />
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 ml-2">
                      <Link to="/login">
                        <Button variant="ghost" size="sm" className="font-semibold">
                          Đăng nhập
                        </Button>
                      </Link>
                      <Link to="/register">
                        <Button variant="primary" size="sm" className="font-semibold shadow-sm shadow-indigo-500/30">
                          Đăng ký
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Mobile Menu Hamburger Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>
            </div>

            {/* Mobile Dropdown Search */}
            {mobileSearchOpen && (
              <div className="md:hidden py-3 border-t border-gray-100 dark:border-gray-800 animate-slide-up">
                <SearchInput
                  placeholder="Tìm sách, tác giả..."
                  value=""
                  onChange={handleSearch}
                />
              </div>
            )}

            {/* Mobile Sliding Menu Drawer */}
            {mobileMenuOpen && (
              <div className="md:hidden py-3 space-y-2 border-t border-gray-100 dark:border-gray-800 animate-slide-up">
                <Link
                  to="/"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-800 font-medium"
                >
                  <Home size={18} />
                  Trang chủ
                </Link>
                <Link
                  to="/books"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-800 font-medium"
                >
                  <BookOpen size={18} />
                  Tất cả sách
                </Link>

                {isAuthenticated ? (
                  <>
                    <Link
                      to="/orders"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-800 font-medium"
                    >
                      <ClipboardList size={18} />
                      Đơn hàng của tôi
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-800 font-medium"
                    >
                      <User size={18} />
                      Hồ sơ ({user?.full_name})
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium"
                    >
                      <LogOut size={18} />
                      Đăng xuất
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <Link to="/login" className="block">
                      <Button variant="ghost" size="sm" className="w-full justify-center">
                        Đăng nhập
                      </Button>
                    </Link>
                    <Link to="/register" className="block">
                      <Button variant="primary" size="sm" className="w-full justify-center">
                        Đăng ký
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area (padding bottom on mobile to accommodate bottom nav) */}
        <main className="flex-1 pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Value Proposition Highlights Banner */}
        <section className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center sm:text-left">
              <div className="flex items-center gap-4 justify-center sm:justify-start p-3 rounded-xl bg-slate-50 dark:bg-gray-800/50">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Truck size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Giao hàng toàn quốc</h4>
                  <p className="text-xs text-gray-500">Đóng gói cẩn thận, bọc chống sốc</p>
                </div>
              </div>

              <div className="flex items-center gap-4 justify-center sm:justify-start p-3 rounded-xl bg-slate-50 dark:bg-gray-800/50">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Sách chính hãng 100%</h4>
                  <p className="text-xs text-gray-500">Từ các nhà xuất bản uy tín</p>
                </div>
              </div>

              <div className="flex items-center gap-4 justify-center sm:justify-start p-3 rounded-xl bg-slate-50 dark:bg-gray-800/50">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                  <RotateCcw size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Đổi trả trong 7 ngày</h4>
                  <p className="text-xs text-gray-500">Nếu sách bị lỗi in ấn hay móp méo</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 pt-12 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
              {/* Brand Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white">
                    P
                  </div>
                  <span className="text-lg font-bold text-white tracking-tight">Phương Anh Store</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Nhà sách trực tuyến với trải nghiệm mua sắm hiện đại, thông minh, mang tri thức đến từng độc giả trên toàn quốc.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-3">Khám phá</h4>
                <ul className="space-y-2 text-xs text-gray-400">
                  <li><Link to="/books" className="hover:text-indigo-400 transition-colors">Tất cả sách</Link></li>
                  <li><Link to="/books?sort=newest" className="hover:text-indigo-400 transition-colors">Sách mới phát hành</Link></li>
                  <li><Link to="/books?sort=popular" className="hover:text-indigo-400 transition-colors">Sách bán chạy</Link></li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-3">Chính sách & Hỗ trợ</h4>
                <ul className="space-y-2 text-xs text-gray-400">
                  <li><Link to="/profile" className="hover:text-indigo-400 transition-colors">Quản lý tài khoản</Link></li>
                  <li><Link to="/orders" className="hover:text-indigo-400 transition-colors">Tra cứu đơn hàng</Link></li>
                  <li><a href="#" className="hover:text-indigo-400 transition-colors">Chính sách vận chuyển</a></li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-3">Liên hệ hỗ trợ</h4>
                <p className="text-xs text-gray-400 mb-1.5">Hotline: <span className="text-indigo-400 font-semibold">1900 1234</span> (8:00 - 21:00)</p>
                <p className="text-xs text-gray-400 mb-1.5">Email: support@phuonganhbook.vn</p>
                <p className="text-xs text-gray-400">Địa chỉ: Hà Nội, Việt Nam</p>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
              <p>&copy; {new Date().getFullYear()} Phương Anh Bookstore. Bản quyền thuộc về Phương Anh.</p>
            </div>
          </div>
        </footer>

        {/* Mobile Thumb-Friendly Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around">
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[11px] font-medium transition ${isNavActive('/') && location.pathname === '/'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600'
              }`}
          >
            <Home size={20} />
            <span>Trang chủ</span>
          </Link>

          <Link
            to="/books"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[11px] font-medium transition ${isNavActive('/books')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600'
              }`}
          >
            <BookOpen size={20} />
            <span>Tủ sách</span>
          </Link>

          <Link
            to="/cart"
            className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[11px] font-medium transition ${isNavActive('/cart')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600'
              }`}
          >
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span className="absolute top-0 right-2 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
            <span>Giỏ hàng</span>
          </Link>

          <Link
            to="/orders"
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[11px] font-medium transition ${isNavActive('/orders')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600'
              }`}
          >
            <ClipboardList size={20} />
            <span>Đơn hàng</span>
          </Link>

          <Link
            to={isAuthenticated ? '/profile' : '/login'}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[11px] font-medium transition ${isNavActive('/profile') || isNavActive('/login')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600'
              }`}
          >
            <User size={20} />
            <span>{isAuthenticated ? 'Tài khoản' : 'Đăng nhập'}</span>
          </Link>
        </nav>

        {/* AI Assistant Chatbot */}
        <ChatWidget />
      </div>

      <ToastContainer />
    </ErrorBoundary>
  );
};

export default CustomerLayout;
