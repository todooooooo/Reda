import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BedDouble, User, Wrench, Wind, Check, AlertTriangle, Key, ArrowRight, X, Trash2, Bed, Users, CalendarDays, DollarSign, StickyNote, Hotel } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const statusConfig = {
    'Propre': { color: 'bg-green-500', icon: Check },
    'Sale': { color: 'bg-yellow-500', icon: AlertTriangle },
    'Occupée': { color: 'bg-red-600', icon: Key },
    'Arrivée': { color: 'bg-blue-500', icon: ArrowRight },
    'Départ': { color: 'bg-purple-500', icon: X },
    'Recouche': { color: 'bg-pink-500', icon: BedDouble },
    'Hors service': { color: 'bg-gray-700', icon: Wrench },
    'Manque': { color: 'bg-orange-500', icon: Wind },
};

const roomTypeIcons = {
    'Single': Bed,
    'Double': BedDouble,
    'Triple': Users,
    'Quatre': Users,
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

export const RoomCard = ({ room, onClick, delay }) => {
    const config = statusConfig[room.status] || statusConfig['Propre'];
    const StatusIcon = config.icon;

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay }}
                        whileHover={{ scale: 1.05, zIndex: 10 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onClick}
                        className={cn(
                            'relative aspect-square rounded-lg shadow-md cursor-pointer overflow-hidden transition-all duration-300 group',
                            config.color
                        )}
                    >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300" />
                        
                        {room.room_type && (
                            <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/30 rounded-full px-2 py-0.5 text-xs text-white">
                                <span>{room.room_type}</span>
                            </div>
                        )}
                        
                        <div className="absolute bottom-1 right-1 flex items-center gap-1 bg-black/30 rounded-full px-1.5 py-0.5 text-xs text-white">
                            <StatusIcon className="w-3 h-3" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center justify-center h-full p-2 text-white">
                            <h3 className="text-2xl sm:text-3xl font-bold">{room.room_number}</h3>
                            <p className="text-xs font-semibold capitalize truncate">{room.status}</p>
                            {room.guest_name && (room.status === 'Occupée' || room.status === 'Arrivée' || room.status === 'Départ' || room.status === 'Recouche') && (
                                <p className="text-xs text-center mt-1 truncate" title={room.guest_name}>{room.guest_name}</p>
                            )}
                        </div>
                    </motion.div>
                </TooltipTrigger>
                <TooltipContent className="bg-background border-primary shadow-lg p-4 rounded-lg w-64">
                    <div className="space-y-2 text-sm">
                       <p className="font-bold text-base text-primary">Chambre {room.room_number}</p>
                       <div className="flex items-start gap-2">
                           <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                           <span>{room.guest_name || 'Pas de client'}</span>
                       </div>
                       <div className="flex items-start gap-2">
                           <CalendarDays className="w-4 h-4 text-muted-foreground mt-0.5" />
                           <span>{formatDate(room.check_in)} - {formatDate(room.check_out)}</span>
                       </div>
                       <div className="flex items-start gap-2">
                            <Bed className="w-4 h-4 text-muted-foreground mt-0.5" />
                           <span>{room.room_type || 'N/A'}</span>
                       </div>
                       {room.price && (
                           <div className="flex items-start gap-2">
                               <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
                               <span>{room.price} €</span>
                           </div>
                       )}
                       {room.notes && (
                           <div className="flex items-start gap-2">
                               <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5" />
                               <span className="text-xs italic truncate">{room.notes}</span>
                           </div>
                       )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
