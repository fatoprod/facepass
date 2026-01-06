import React, { useState, useEffect } from 'react';
import { Event } from '../types';
import { 
  addEvent, 
  updateEvent, 
  deleteEvent, 
  subscribeToEvents 
} from '../services/eventsService';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign,
  X,
  Save,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Image
} from 'lucide-react';

interface EventFormData {
  name: string;
  description: string;
  date: string;
  location: string;
  image: string;
  isFree: boolean;
  price: number;
  maxCapacity: number;
  isActive: boolean;
}

const initialFormData: EventFormData = {
  name: '',
  description: '',
  date: '',
  location: '',
  image: 'https://picsum.photos/800/400',
  isFree: true,
  price: 0,
  maxCapacity: 100,
  isActive: true
};

export const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToEvents((loadedEvents) => {
      setEvents(loadedEvents);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description,
      date: event.date,
      location: event.location,
      image: event.image,
      isFree: event.isFree,
      price: event.price,
      maxCapacity: event.maxCapacity,
      isActive: event.isActive
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const eventData = {
        ...formData,
        price: formData.isFree ? 0 : formData.price,
        currentAttendees: editingEvent?.currentAttendees || 0,
        createdAt: editingEvent?.createdAt || new Date().toISOString()
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
      } else {
        await addEvent(eventData as Omit<Event, 'id'>);
      }

      setShowModal(false);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      alert('Erro ao salvar evento. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        await deleteEvent(eventId);
      } catch (error) {
        console.error('Erro ao excluir evento:', error);
        alert('Erro ao excluir evento.');
      }
    }
  };

  const toggleEventStatus = async (event: Event) => {
    try {
      await updateEvent(event.id, { isActive: !event.isActive });
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Gerenciar Eventos</h2>
          <p className="text-gray-400 mt-1">Crie e gerencie os eventos do sistema</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition"
        >
          <Plus size={20} />
          Novo Evento
        </button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div 
            key={event.id} 
            className={`bg-gray-800 rounded-xl overflow-hidden border ${event.isActive ? 'border-gray-700' : 'border-red-900/50 opacity-60'}`}
          >
            <div className="relative h-40">
              <img 
                src={event.image} 
                alt={event.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold ${event.isFree ? 'bg-green-500 text-white' : 'bg-amber-500 text-black'}`}>
                  {event.isFree ? 'GRATUITO' : `R$ ${event.price}`}
                </span>
                {!event.isActive && (
                  <span className="px-2 py-1 rounded text-xs font-bold bg-red-500 text-white">
                    INATIVO
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-2">{event.name}</h3>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{event.description}</p>
              
              <div className="space-y-1 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span className="truncate">{event.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span>{event.currentAttendees}/{event.maxCapacity} participantes</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleEventStatus(event)}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    event.isActive 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-green-900/30 hover:bg-green-900/50 text-green-400'
                  }`}
                >
                  {event.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  {event.isActive ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => openEditModal(event)}
                  className="px-3 py-2 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 rounded-lg transition"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhum evento cadastrado</p>
            <p className="text-sm">Clique em "Novo Evento" para começar</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Nome do Evento *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="Ex: TechFuture Summit 2025"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                  rows={3}
                  placeholder="Descreva o evento..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Data *</label>
                  <input
                    type="datetime-local"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Capacidade Máxima</label>
                  <input
                    type="number"
                    value={formData.maxCapacity}
                    onChange={e => setFormData({...formData, maxCapacity: parseInt(e.target.value) || 0})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Local *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="Ex: Expo Center Norte, São Paulo"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">URL da Imagem</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.image}
                    onChange={e => setFormData({...formData, image: e.target.value})}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, image: `https://picsum.photos/800/400?random=${Date.now()}`})}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300"
                  >
                    <Image size={20} />
                  </button>
                </div>
              </div>

              {/* Free/Paid Toggle */}
              <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="text-white font-medium">Tipo de Evento</label>
                    <p className="text-gray-400 text-sm">Defina se o evento é gratuito ou pago</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, isFree: !formData.isFree, price: 0})}
                    className={`relative w-14 h-8 rounded-full transition-colors ${formData.isFree ? 'bg-green-600' : 'bg-amber-600'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${formData.isFree ? 'left-1' : 'left-7'}`} />
                  </button>
                </div>

                <div className={`flex items-center gap-2 ${formData.isFree ? 'text-green-400' : 'text-amber-400'}`}>
                  <DollarSign size={20} />
                  <span className="font-bold">{formData.isFree ? 'Evento Gratuito' : 'Evento Pago'}</span>
                </div>

                {!formData.isFree && (
                  <div className="mt-4">
                    <label className="block text-gray-400 text-sm mb-1">Preço (R$)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between bg-gray-900 p-4 rounded-xl border border-gray-700">
                <div>
                  <label className="text-white font-medium">Evento Ativo</label>
                  <p className="text-gray-400 text-sm">Eventos inativos não aparecem para os visitantes</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                  className={`relative w-14 h-8 rounded-full transition-colors ${formData.isActive ? 'bg-brand-600' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${formData.isActive ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold rounded-xl transition"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {editingEvent ? 'Salvar' : 'Criar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
