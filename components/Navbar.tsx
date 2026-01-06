import React from 'react';
import { Ticket, ShieldCheck, LayoutDashboard, Calendar } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  setView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'home', label: 'Eventos', icon: Ticket },
    { id: 'admin-events', label: 'Gerenciar Eventos', icon: Calendar },
    { id: 'admin', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gate', label: 'Catraca', icon: ShieldCheck },
  ];

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
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
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
          </div>

           {/* Mobile menu button simplified */}
           <div className="md:hidden">
             <button onClick={() => setView('home')} className="text-gray-300">
               <Ticket />
             </button>
           </div>
        </div>
      </div>
    </nav>
  );
};
