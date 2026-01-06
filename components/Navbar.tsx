import React from 'react';
import { Ticket, ShieldCheck, LayoutDashboard, Calendar, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  currentView: string;
  setView: (view: string) => void;
  isAuthenticated?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView, isAuthenticated }) => {
  const { logout } = useAuth();
  
  // Itens públicos sempre visíveis
  const publicItems = [
    { id: 'home', label: 'Eventos', icon: Ticket },
    { id: 'gate', label: 'Catraca', icon: ShieldCheck },
  ];

  // Itens admin só visíveis quando autenticado
  const adminItems = [
    { id: 'admin-events', label: 'Gerenciar Eventos', icon: Calendar },
    { id: 'admin', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const navItems = isAuthenticated 
    ? [...publicItems, ...adminItems]
    : publicItems;

  const handleLogout = () => {
    logout();
    setView('home');
  };

  return (
    <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}>
            <div className="bg-gradient-to-r from-brand-500 to-accent-500 p-2 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              FacePass
            </span>
          </div>
          
          <div className="hidden md:flex items-center">
            <div className="flex items-baseline space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                    currentView === item.id
                      ? 'bg-gray-800 text-brand-400'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Login/Logout Button */}
            <div className="ml-4 pl-4 border-l border-gray-700">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-200 flex items-center space-x-2"
                >
                  <LogOut size={16} />
                  <span>Sair</span>
                </button>
              ) : (
                <button
                  onClick={() => setView('login')}
                  className="px-3 py-2 rounded-md text-sm font-medium text-brand-400 hover:bg-brand-500/10 hover:text-brand-300 transition-colors duration-200 flex items-center space-x-2"
                >
                  <LogIn size={16} />
                  <span>Admin</span>
                </button>
              )}
            </div>
          </div>

           {/* Mobile menu */}
           <div className="md:hidden flex items-center space-x-2">
             <button onClick={() => setView('home')} className="text-gray-300 p-2">
               <Ticket size={20} />
             </button>
             {isAuthenticated ? (
               <button onClick={handleLogout} className="text-red-400 p-2">
                 <LogOut size={20} />
               </button>
             ) : (
               <button onClick={() => setView('login')} className="text-brand-400 p-2">
                 <LogIn size={20} />
               </button>
             )}
           </div>
        </div>
      </div>
    </nav>
  );
};
