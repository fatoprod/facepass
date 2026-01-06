import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, TicketType, User, Event } from './types';
import { Navbar } from './components/Navbar';
import { TICKET_PRICES } from './constants';
import { validateFaceForRegistration, identifyUserAtGate } from './services/geminiService';
import { addTicket, subscribeToTickets, updateTicketStatus } from './services/firestoreService';
import { subscribeToActiveEvents, incrementEventAttendees } from './services/eventsService';
import { CameraCapture } from './components/CameraCapture';
import { AdminEvents } from './components/AdminEvents';
import { 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  User as UserIcon, 
  Calendar, 
  MapPin, 
  Loader2,
  ScanFace,
  ShieldCheck,
  LogOut,
  Users,
  ArrowRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- Views ---

const HomePage = ({ events, onSelectEvent, isLoading }: { events: Event[]; onSelectEvent: (event: Event) => void; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center text-center p-6">
        <Calendar className="w-24 h-24 text-gray-600 mb-6" />
        <h1 className="text-3xl font-bold text-white mb-4">Nenhum evento disponível</h1>
        <p className="text-gray-400 max-w-md">No momento não há eventos cadastrados. Volte em breve!</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Eventos Disponíveis</h1>
        <p className="text-xl text-gray-400">Escolha um evento e cadastre seu rosto para acesso sem filas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.map((event) => (
          <div 
            key={event.id}
            onClick={() => onSelectEvent(event)}
            className="bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700 hover:border-brand-500 transition-all cursor-pointer group hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1"
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={event.image} 
                alt={event.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
              <div className="absolute top-4 right-4">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  event.isFree 
                    ? 'bg-green-500 text-white' 
                    : 'bg-amber-500 text-black'
                }`}>
                  {event.isFree ? 'GRATUITO' : `R$ ${event.price}`}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-bold text-white">{event.name}</h3>
              </div>
            </div>
            
            <div className="p-5">
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">{event.description}</p>
              
              <div className="space-y-2 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-brand-400" />
                  <span>{new Date(event.date).toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-brand-400" />
                  <span className="truncate">{event.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-brand-400" />
                  <span>{event.currentAttendees}/{event.maxCapacity} participantes</span>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition group-hover:shadow-lg group-hover:shadow-brand-500/30">
                <span>{event.isFree ? 'Cadastrar Agora' : 'Comprar Ingresso'}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Event Detail / Registration Flow ---
const EventRegistrationFlow = ({ event, onComplete, onBack }: { event: Event; onComplete: (ticket: Ticket) => void; onBack: () => void }) => {
  const [step, setStep] = useState(1); // 1: Data, 2: Payment (if paid), 3: Face Reg
  const [formData, setFormData] = useState({ name: '', email: '', cpf: '', phone: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);

  const totalSteps = event.isFree ? 2 : 3;

  const handlePayment = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsProcessing(false);
    setStep(3);
  };

  const handleFaceCapture = async (base64: string) => {
    setIsProcessing(true);
    setFaceError(null);
    
    const validation = await validateFaceForRegistration(base64);
    
    if (!validation.isValid) {
      setFaceError(validation.reason);
      setIsProcessing(false);
      return;
    }

    const newTicket: Ticket = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      eventId: event.id,
      userId: Math.random().toString(36).substr(2, 9),
      user: {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf
      },
      type: event.isFree ? TicketType.FREE : TicketType.STANDARD,
      price: event.isFree ? 0 : event.price,
      status: TicketStatus.ACTIVE,
      purchaseDate: new Date().toISOString(),
      faceImageBase64: base64
    };

    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);
    onComplete(newTicket);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="mb-6 text-gray-400 hover:text-white flex items-center gap-2"
      >
        ← Voltar aos eventos
      </button>

      {/* Event Header */}
      <div className="bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700 mb-6">
        <div className="relative h-40">
          <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${
              event.isFree ? 'bg-green-500 text-white' : 'bg-amber-500 text-black'
            }`}>
              {event.isFree ? 'GRATUITO' : `R$ ${event.price}`}
            </span>
            <h2 className="text-2xl font-bold text-white">{event.name}</h2>
          </div>
        </div>
        <div className="p-4 flex gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            {new Date(event.date).toLocaleDateString('pt-BR')}
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={14} />
            {event.location}
          </div>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="flex justify-between mb-8 relative">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(i => (
          <div key={i} className={`flex flex-col items-center z-10 ${i <= step ? 'text-brand-400' : 'text-gray-600'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-colors ${
              i <= step ? 'bg-brand-900 border-2 border-brand-500' : 'bg-gray-800 border-2 border-gray-700'
            }`}>
              {i}
            </div>
            <span className="text-xs font-medium">
              {i === 1 ? 'Dados' : (i === 2 && !event.isFree) ? 'Pagamento' : 'Biometria'}
            </span>
          </div>
        ))}
        <div className="absolute top-5 left-0 h-0.5 bg-gray-800 w-full -z-0">
          <div className="h-full bg-brand-600 transition-all duration-500" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }} />
        </div>
      </div>

      <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 shadow-xl">
        {/* Step 1: Personal Data */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Seus Dados</h2>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Nome Completo *</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="João da Silva"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Email *</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="joao@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">CPF *</label>
              <input 
                type="text" 
                value={formData.cpf}
                onChange={e => setFormData({...formData, cpf: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Telefone</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="(11) 99999-9999"
              />
            </div>
            <button 
              onClick={() => setStep(event.isFree ? 2 : 2)}
              disabled={!formData.name || !formData.email || !formData.cpf}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl mt-4 transition"
            >
              {event.isFree ? 'Continuar para Biometria' : 'Continuar para Pagamento'}
            </button>
          </div>
        )}

        {/* Step 2: Payment (only for paid events) */}
        {step === 2 && !event.isFree && (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Pagamento</h2>
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 text-left">
              <div className="flex justify-between mb-2 text-gray-400">
                <span>Ingresso - {event.name}</span>
                <span>R$ {event.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-xl text-white border-t border-gray-700 pt-2 mt-2">
                <span>Total</span>
                <span>R$ {event.price.toFixed(2)}</span>
              </div>
            </div>
            <button 
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition flex justify-center items-center space-x-2"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <CreditCard />}
              <span>{isProcessing ? 'Processando...' : 'Pagar Agora'}</span>
            </button>
          </div>
        )}

        {/* Step 2/3: Face Registration */}
        {((step === 2 && event.isFree) || (step === 3 && !event.isFree)) && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white mb-2">Cadastro Facial</h2>
            <p className="text-gray-400 mb-6 text-center">
              Para entrar no evento, precisamos registrar seu rosto. Olhe para a câmera em um ambiente iluminado.
            </p>
            
            {isProcessing ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-16 h-16 text-brand-500 animate-spin mb-4" />
                <p className="text-lg font-medium animate-pulse">Validando biometria com IA...</p>
              </div>
            ) : (
              <CameraCapture onCapture={handleFaceCapture} label="Registrar Rosto" />
            )}

            {faceError && (
              <div className="mt-4 bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-1" />
                <p>{faceError}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Free Registration Flow (Legacy - keeping for backward compatibility) ---
const FreeRegistrationFlow = ({ onComplete }: { onComplete: (ticket: Ticket) => void }) => {
  const [step, setStep] = useState(1); // 1: Data, 2: Face Reg
  const [formData, setFormData] = useState({ name: '', email: '', cpf: '', phone: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);

  const handleFaceCapture = async (base64: string) => {
    setIsProcessing(true);
    setFaceError(null);
    
    const validation = await validateFaceForRegistration(base64);
    
    if (!validation.isValid) {
      setFaceError(validation.reason);
      setIsProcessing(false);
      return;
    }

    // Create free ticket
    const newTicket: Ticket = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      userId: Math.random().toString(36).substr(2, 9),
      user: {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf
      },
      type: TicketType.FREE,
      price: 0,
      status: TicketStatus.ACTIVE,
      purchaseDate: new Date().toISOString(),
      faceImageBase64: base64
    };

    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);
    onComplete(newTicket);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between mb-8 relative">
        {[1, 2].map(i => (
          <div key={i} className={`flex flex-col items-center z-10 ${i <= step ? 'text-green-400' : 'text-gray-600'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-colors ${i <= step ? 'bg-green-900 border-2 border-green-500' : 'bg-gray-800 border-2 border-gray-700'}`}>
              {i}
            </div>
            <span className="text-xs font-medium">{i === 1 ? 'Dados Pessoais' : 'Biometria'}</span>
          </div>
        ))}
        <div className="absolute top-5 left-0 h-0.5 bg-gray-800 w-full -z-0">
          <div className="h-full bg-green-600 transition-all duration-500" style={{ width: `${((step - 1) / 1) * 100}%` }}></div>
        </div>
      </div>

      <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 shadow-xl">
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <UserIcon className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Cadastro Gratuito</h2>
            </div>
            <p className="text-gray-400 text-sm mb-6">Preencha seus dados para se cadastrar no sistema de reconhecimento facial.</p>
            
            <div>
              <label className="block text-gray-400 text-sm mb-1">Nome Completo *</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="João da Silva"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Email *</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="joao@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">CPF *</label>
              <input 
                type="text" 
                value={formData.cpf}
                onChange={e => setFormData({...formData, cpf: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Telefone</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="(11) 99999-9999"
              />
            </div>
            <button 
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.email || !formData.cpf}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl mt-4 transition"
            >
              Continuar para Biometria
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white mb-2">Cadastro Facial</h2>
            <p className="text-gray-400 mb-6 text-center">Para acesso ao evento, precisamos registrar seu rosto. Olhe para a câmera em um ambiente iluminado.</p>
            
            {isProcessing ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-16 h-16 text-green-500 animate-spin mb-4" />
                <p className="text-lg font-medium animate-pulse">Validando biometria com IA...</p>
              </div>
            ) : (
              <CameraCapture onCapture={handleFaceCapture} label="Registrar Rosto" />
            )}

            {faceError && (
              <div className="mt-4 bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-1" />
                <p>{faceError}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PurchaseFlow = ({ onComplete }: { onComplete: (ticket: Ticket) => void }) => {
  const [step, setStep] = useState(1); // 1: Data, 2: Payment, 3: Face Reg
  const [formData, setFormData] = useState({ name: '', email: '', cpf: '', type: TicketType.STANDARD });
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsProcessing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsProcessing(false);
    setStep(3);
  };

  const handleFaceCapture = async (base64: string) => {
    setIsProcessing(true);
    setFaceError(null);
    
    const validation = await validateFaceForRegistration(base64);
    
    if (!validation.isValid) {
      setFaceError(validation.reason);
      setIsProcessing(false);
      return;
    }

    // Create ticket
    const newTicket: Ticket = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      userId: Math.random().toString(36).substr(2, 9),
      user: {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf
      },
      type: formData.type,
      price: TICKET_PRICES[formData.type],
      status: TicketStatus.ACTIVE,
      purchaseDate: new Date().toISOString(),
      faceImageBase64: base64
    };

    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsProcessing(false);
    onComplete(newTicket);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between mb-8 relative">
        {[1, 2, 3].map(i => (
          <div key={i} className={`flex flex-col items-center z-10 ${i <= step ? 'text-brand-400' : 'text-gray-600'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-colors ${i <= step ? 'bg-brand-900 border-2 border-brand-500' : 'bg-gray-800 border-2 border-gray-700'}`}>
              {i}
            </div>
            <span className="text-xs font-medium">{i === 1 ? 'Dados' : i === 2 ? 'Pagamento' : 'Biometria'}</span>
          </div>
        ))}
        <div className="absolute top-5 left-0 h-0.5 bg-gray-800 w-full -z-0">
          <div className="h-full bg-brand-600 transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
        </div>
      </div>

      <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 shadow-xl">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-4">Seus Dados</h2>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Nome Completo</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="João Silva"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Email</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="joao@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Tipo de Ingresso</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.values(TicketType).map(type => (
                  <button
                    key={type}
                    onClick={() => setFormData({...formData, type})}
                    className={`p-3 rounded-lg border text-sm font-bold transition ${formData.type === type ? 'bg-brand-900/50 border-brand-500 text-brand-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                  >
                    {type}
                    <div className="text-xs font-normal mt-1">R$ {TICKET_PRICES[type]}</div>
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.email}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl mt-4 transition"
            >
              Continuar para Pagamento
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 text-center">
             <h2 className="text-2xl font-bold text-white mb-2">Pagamento</h2>
             <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 text-left">
                <div className="flex justify-between mb-2 text-gray-400">
                  <span>Ingresso {formData.type}</span>
                  <span>R$ {TICKET_PRICES[formData.type].toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xl text-white border-t border-gray-700 pt-2 mt-2">
                  <span>Total</span>
                  <span>R$ {TICKET_PRICES[formData.type].toFixed(2)}</span>
                </div>
             </div>
             <button 
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition flex justify-center items-center space-x-2"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <CreditCard />}
              <span>{isProcessing ? 'Processando...' : 'Pagar Agora'}</span>
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold text-white mb-2">Cadastro Facial</h2>
            <p className="text-gray-400 mb-6 text-center">Para entrar no evento, precisamos registrar seu rosto. Olhe para a câmera em um ambiente iluminado.</p>
            
            {isProcessing ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-16 h-16 text-brand-500 animate-spin mb-4" />
                <p className="text-lg font-medium animate-pulse">Validando biometria com IA...</p>
              </div>
            ) : (
              <CameraCapture onCapture={handleFaceCapture} label="Registrar Rosto" />
            )}

            {faceError && (
              <div className="mt-4 bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="shrink-0 mt-1" />
                <p>{faceError}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = ({ tickets }: { tickets: Ticket[] }) => {
  const revenue = tickets.reduce((acc, t) => acc + t.price, 0);
  
  const typeData = Object.values(TicketType).map(type => ({
    name: type,
    value: tickets.filter(t => t.type === type).length
  })).filter(d => d.value > 0);

  const statusData = tickets.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const statusChartData = Object.keys(statusData).map(key => ({ name: key, value: statusData[key] }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <h2 className="text-3xl font-bold text-white">Painel Administrativo</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="text-gray-400 mb-2">Vendas Totais</div>
          <div className="text-4xl font-bold text-white">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="text-gray-400 mb-2">Ingressos Vendidos</div>
          <div className="text-4xl font-bold text-brand-400">{tickets.length}</div>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="text-gray-400 mb-2">Cadastros Faciais</div>
          <div className="text-4xl font-bold text-green-400">{tickets.filter(t => t.faceImageBase64).length}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-80">
          <h3 className="text-lg font-semibold mb-4">Vendas por Tipo</h3>
          <ResponsiveContainer width="100%" height="100%">
             {typeData.length > 0 ? (
               <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                <Legend />
              </PieChart>
             ) : <div className="flex items-center justify-center h-full text-gray-500">Sem dados</div>}
          </ResponsiveContainer>
        </div>
         <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-80">
          <h3 className="text-lg font-semibold mb-4">Status dos Ingressos</h3>
          <ResponsiveContainer width="100%" height="100%">
            {statusChartData.length > 0 ? (
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 10}} />
                <YAxis stroke="#9ca3af" />
                <Tooltip cursor={{fill: '#374151'}} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : <div className="flex items-center justify-center h-full text-gray-500">Sem dados</div>}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Últimos Compradores</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Usuário</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Foto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{t.user.name}</div>
                    <div className="text-sm text-gray-400">{t.user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.type === TicketType.VIP ? 'bg-amber-900/30 text-amber-400 border border-amber-700' : 'bg-blue-900/30 text-blue-400 border border-blue-700'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{t.status}</td>
                  <td className="px-6 py-4">
                    {t.faceImageBase64 ? (
                      <img src={t.faceImageBase64} className="w-10 h-10 rounded-full object-cover border border-gray-600" alt="Face" />
                    ) : <span className="text-gray-500">-</span>}
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Nenhum ingresso vendido ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const GateScanner = ({ tickets, onEntry }: { tickets: Ticket[], onEntry: (id: string) => void }) => {
  const [scannedData, setScannedData] = useState<{ticket?: Ticket, match: boolean, loading: boolean, message?: string} | null>(null);

  const handleScan = async (base64: string) => {
    setScannedData({ match: false, loading: true });
    
    // Use Gemini to find the user in the list of tickets
    const result = await identifyUserAtGate(base64, tickets);
    
    if (result.matchFound && result.ticketId) {
      const ticket = tickets.find(t => t.id === result.ticketId);
      if (ticket) {
        onEntry(ticket.id);
        setScannedData({
          match: true,
          loading: false,
          ticket: ticket,
          message: `Confiança: ${result.confidence}`
        });
        return;
      }
    }

    setScannedData({
      match: false,
      loading: false,
      message: "Rosto não encontrado no banco de dados do evento."
    });
  };

  const reset = () => setScannedData(null);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
      {/* Left: Scanner */}
      <div className="w-full lg:w-1/2 p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <ScanFace className="text-brand-500" />
          Catraca de Acesso
        </h2>
        
        {scannedData?.loading ? (
           <div className="flex flex-col items-center justify-center h-64">
             <Loader2 className="w-16 h-16 text-brand-500 animate-spin mb-4" />
             <p className="text-xl font-mono text-brand-200">IDENTIFICANDO...</p>
           </div>
        ) : scannedData ? (
           <div className="text-center animate-fade-in">
             <button onClick={reset} className="mb-6 text-gray-400 hover:text-white underline">Escanear Próximo</button>
           </div>
        ) : (
          <CameraCapture onCapture={handleScan} label="Escanear Visitante" />
        )}
      </div>

      {/* Right: Result Display */}
      <div className={`w-full lg:w-1/2 p-8 flex flex-col justify-center transition-colors duration-500 ${
        scannedData?.match ? 'bg-green-900/20' : scannedData && !scannedData.loading ? 'bg-red-900/20' : 'bg-gray-900/50'
      }`}>
        {!scannedData ? (
          <div className="text-center text-gray-500">
            <ShieldCheck className="w-24 h-24 mx-auto mb-4 opacity-20" />
            <p className="text-xl">Aguardando leitura biométrica...</p>
          </div>
        ) : scannedData.loading ? (
          <div className="text-center text-gray-400">Analizando vetores faciais...</div>
        ) : scannedData.match && scannedData.ticket ? (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500 text-white mb-4 shadow-lg shadow-green-500/50">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-4xl font-extrabold text-white tracking-wide">ACESSO LIBERADO</h2>
            
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 max-w-md mx-auto shadow-2xl">
              <div className="flex items-center space-x-4 mb-6">
                {scannedData.ticket.faceImageBase64 && (
                   <img src={scannedData.ticket.faceImageBase64} alt="User" className="w-20 h-20 rounded-full object-cover border-2 border-green-500" />
                )}
                <div className="text-left">
                  <h3 className="text-xl font-bold text-white">{scannedData.ticket.user.name}</h3>
                  <p className="text-gray-400">{scannedData.ticket.type}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-left text-sm">
                <div>
                  <span className="block text-gray-500">CPF</span>
                  <span className="text-gray-200">{scannedData.ticket.user.cpf}</span>
                </div>
                <div>
                  <span className="block text-gray-500">ID do Ingresso</span>
                  <span className="text-gray-200 font-mono">{scannedData.ticket.id}</span>
                </div>
              </div>

              {scannedData.message && (
                 <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-green-400 font-mono">
                   IA: {scannedData.message}
                 </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500 text-white mb-4 shadow-lg shadow-red-500/50">
              <LogOut size={48} /> {/* Using Logout icon as 'Access Denied' visual */}
            </div>
            <h2 className="text-4xl font-extrabold text-white tracking-wide">ACESSO NEGADO</h2>
            <p className="text-red-300 text-xl">{scannedData.message}</p>
            <div className="p-4 bg-red-900/30 rounded-lg max-w-md mx-auto border border-red-800">
              <p className="text-gray-300 text-sm">O rosto escaneado não corresponde a nenhum ingresso válido ou ativo no sistema.</p>
            </div>
            <button onClick={reset} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold">Tentar Novamente</button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [view, setView] = useState('home'); // home, event-register, admin, admin-events, gate
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastPurchasedTicket, setLastPurchasedTicket] = useState<Ticket | null>(null);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // Carregar tickets do Firestore em tempo real
  useEffect(() => {
    const unsubscribe = subscribeToTickets((loadedTickets) => {
      setTickets(loadedTickets);
      setIsLoadingTickets(false);
    });

    return () => unsubscribe();
  }, []);

  // Carregar eventos ativos do Firestore em tempo real
  useEffect(() => {
    const unsubscribe = subscribeToActiveEvents((loadedEvents) => {
      setEvents(loadedEvents);
      setIsLoadingEvents(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setView('event-register');
  };

  const handleTicketComplete = async (ticket: Ticket) => {
    try {
      const { id, ...ticketData } = ticket;
      const savedTicket = await addTicket(ticketData);
      
      // Incrementar participantes do evento
      if (ticket.eventId) {
        await incrementEventAttendees(ticket.eventId);
      }
      
      setLastPurchasedTicket(savedTicket);
      setSelectedEvent(null);
      setView('home');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erro ao salvar ticket:', error);
      alert('Erro ao salvar o ingresso. Tente novamente.');
    }
  };

  const handleEntry = async (id: string) => {
    try {
      await updateTicketStatus(id, TicketStatus.USED);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-brand-500 selection:text-white">
      <Navbar currentView={view} setView={(v) => { setView(v); setSelectedEvent(null); }} />

      <main>
        {view === 'home' && (
          <HomePage 
            events={events} 
            onSelectEvent={handleSelectEvent} 
            isLoading={isLoadingEvents}
          />
        )}
        {view === 'event-register' && selectedEvent && (
          <EventRegistrationFlow 
            event={selectedEvent} 
            onComplete={handleTicketComplete}
            onBack={() => { setView('home'); setSelectedEvent(null); }}
          />
        )}
        {view === 'admin' && <AdminDashboard tickets={tickets} />}
        {view === 'admin-events' && <AdminEvents />}
        {view === 'gate' && <GateScanner tickets={tickets} onEntry={handleEntry} />}
      </main>

      {/* Success Modal */}
      {showSuccessModal && lastPurchasedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-green-500 shadow-2xl shadow-green-900/50 transform transition-all scale-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-white w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {lastPurchasedTicket.type === TicketType.FREE ? 'Cadastro Realizado!' : 'Ingresso Comprado!'}
              </h3>
              <p className="text-gray-300 mb-6">Seu rosto foi registrado com sucesso. Basta olhar para a câmera na entrada do evento.</p>
              
              <div className="bg-gray-900 p-4 rounded-lg mb-6 text-left border border-gray-700">
                 <div className="text-xs text-gray-500 uppercase mb-1">ID do Ticket</div>
                 <div className="font-mono text-brand-400 text-lg">{lastPurchasedTicket.id}</div>
                 <div className="text-xs text-gray-500 uppercase mt-2 mb-1">Tipo</div>
                 <div className="text-green-400 font-medium">{lastPurchasedTicket.type}</div>
              </div>

              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-xl transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;