import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Search, Filter } from 'lucide-react';
import { RoomCard } from '@/components/hotel/RoomCard';
import { RoomEditDialog } from '@/components/hotel/RoomEditDialog';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const roomRanges = [
  { floor: 1, start: 100, end: 148 },
  { floor: 2, start: 200, end: 248 },
  { floor: 3, start: 300, end: 334 },
  { floor: 4, start: 400, end: 418 },
];

const statusConfig = {
    'Propre': { color: 'bg-green-500' },
    'Sale': { color: 'bg-yellow-500' },
    'Occupée': { color: 'bg-red-600' },
    'Arrivée': { color: 'bg-blue-500' },
    'Départ': { color: 'bg-purple-500' },
    'Recouche': { color: 'bg-pink-500' },
    'Hors service': { color: 'bg-gray-700' },
    'Manque': { color: 'bg-orange-500' },
};
const ALL_STATUSES = Object.keys(statusConfig);
const ALL_TYPES = ['Single', 'Double', 'Triple', 'Quatre'];

const RoomGrid = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { t } = useTranslation();

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rooms').select('*').order('room_number', { ascending: true });

    if (error) {
      toast({ title: 'Erreur de chargement des chambres', description: error.message, variant: 'destructive' });
      setRooms([]);
    } else {
       if (data.length === 0) {
        const allRoomsToCreate = roomRanges.flatMap(range => 
            Array.from({ length: range.end - range.start + 1 }, (_, i) => ({
                room_number: range.start + i,
                floor: range.floor,
                status: 'Propre'
            }))
        );
        const { error: insertError } = await supabase.from('rooms').insert(allRoomsToCreate);
        if (insertError) {
             toast({ title: "Échec de l'initialisation des chambres", description: insertError.message, variant: 'destructive' });
        } else {
            const { data: newData } = await supabase.from('rooms').select('*').order('room_number', { ascending: true });
            setRooms(newData || []);
        }
      } else {
        setRooms(data);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRooms();
    const channel = supabase.channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
          fetchRooms();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRooms]);
  
  const filteredRooms = useMemo(() => {
        return rooms.filter(room =>
            (room.room_number.toString().includes(searchTerm) || (room.guest_name && room.guest_name.toLowerCase().includes(searchTerm.toLowerCase()))) &&
            (statusFilter === 'all' || room.status === statusFilter) &&
            (typeFilter === 'all' || room.room_type === typeFilter)
        );
  }, [rooms, searchTerm, statusFilter, typeFilter]);

  const handleOpenDialog = (room) => {
    setSelectedRoom(room);
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedRoom(null);
  };
  
  const handleSave = async (updatedRoom) => {
    const { id, ...updateData } = updatedRoom;
    const { error } = await supabase.from('rooms').update(updateData).eq('id', id);

    if (error) {
        toast({ title: 'Échec de la sauvegarde', description: error.message, variant: 'destructive' });
    } else {
        toast({ title: 'Chambre mise à jour !', description: `La chambre ${updatedRoom.room_number} a été enregistrée.` });
        handleCloseDialog();
    }
  };

  const floors = roomRanges.map(range => ({
    floor: range.floor,
    rooms: filteredRooms.filter(room => room.floor === range.floor)
  }));
  
  if (loading && rooms.length === 0) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <p className="ml-4 text-lg">Chargement des chambres...</p>
      </div>
    );
  }

  return (
    <>
      <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.2 }}
         className="bg-card p-4 rounded-lg shadow-sm mb-6 border"
      >
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder={t('searchRoomOrGuest')} className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]"><Filter className="w-4 h-4 mr-2" /> <SelectValue placeholder={t('filterByStatus')} /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('allStatuses')}</SelectItem>
                    {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
            </Select>
             <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]"><Filter className="w-4 h-4 mr-2" /> <SelectValue placeholder={t('filterByType')} /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('allTypes')}</SelectItem>
                    {ALL_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </motion.div>

      <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.3 }}
         className="bg-card p-4 rounded-lg shadow-sm mb-8 border"
      >
        <h3 className="text-lg font-semibold mb-3">Légende des couleurs</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
            {Object.entries(statusConfig).map(([status, { color }]) => (
                <div key={status} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${color}`}></div>
                    <span className="text-sm">{status}</span>
                </div>
            ))}
        </div>
      </motion.div>


      <div className="space-y-12">
        <AnimatePresence>
          {floors.map(({ floor, rooms: floorRooms }) => (
            <motion.section 
              key={floor}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: floor * 0.1 }}
            >
              <h2 className="text-2xl font-semibold mb-4 border-b-2 border-primary pb-2">{t('floor')} {floor}</h2>
              {floorRooms.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                    {floorRooms.map((room, index) => (
                    <RoomCard 
                        key={room.id}
                        room={room}
                        onClick={() => handleOpenDialog(room)}
                        delay={index * 0.02}
                    />
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">{t('noRoomsMatch')}</p>
              )}
            </motion.section>
          ))}
        </AnimatePresence>
      </div>
      
      {selectedRoom && (
        <RoomEditDialog 
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          room={selectedRoom}
          onSave={handleSave}
        />
      )}
    </>
  );
};

export default RoomGrid;
