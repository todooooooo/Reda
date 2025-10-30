import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export const AssignRoomDialog = ({ isOpen, onClose, reservation, fetchReservations }) => {
    const { t } = useTranslation();
    const [availableRooms, setAvailableRooms] = useState({});
    const [selectedRooms, setSelectedRooms] = useState({});
    const [loading, setLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);

    const fetchAvailableRooms = useCallback(async () => {
        if (!reservation || !reservation.reservation_items) return;
        setLoading(true);
        try {
            const roomTypes = reservation.reservation_items.map(item => item.room_type);
            const { data, error } = await supabase
                .from('rooms')
                .select('id, room_number, room_type')
                .eq('status', 'Propre')
                .in('room_type', roomTypes);

            if (error) throw error;

            const groupedRooms = data.reduce((acc, room) => {
                if (!acc[room.room_type]) {
                    acc[room.room_type] = [];
                }
                acc[room.room_type].push(room);
                return acc;
            }, {});

            setAvailableRooms(groupedRooms);
        } catch (error) {
            toast({ title: 'Erreur', description: 'Impossible de charger les chambres disponibles.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [reservation]);

    useEffect(() => {
        if (isOpen) {
            fetchAvailableRooms();
            setSelectedRooms({});
        }
    }, [isOpen, fetchAvailableRooms]);
    
    const handleCheckboxChange = (roomType, roomId) => {
        const requiredQty = reservation.reservation_items.find(item => item.room_type === roomType)?.quantity || 0;
        const currentSelected = selectedRooms[roomType] || [];
        const isChecked = currentSelected.includes(roomId);

        let newSelectedForType;
        if (!isChecked) {
            if (currentSelected.length < requiredQty) {
                newSelectedForType = [...currentSelected, roomId];
            } else {
                toast({
                    title: "Limite atteinte",
                    description: `Vous ne pouvez sélectionner que ${requiredQty} chambre(s) de type ${roomType}.`,
                    variant: 'destructive'
                });
                return; // Prevent checking
            }
        } else {
            newSelectedForType = currentSelected.filter(id => id !== roomId);
        }
        setSelectedRooms(prev => ({ ...prev, [roomType]: newSelectedForType }));
    };

    const isAssignmentComplete = useMemo(() => {
        if (!reservation || !reservation.reservation_items) return false;
        return reservation.reservation_items.every(item => {
            const selectedCount = selectedRooms[item.room_type]?.length || 0;
            return selectedCount === item.quantity;
        });
    }, [selectedRooms, reservation]);

    const handleAssign = async () => {
        if (!isAssignmentComplete) {
            toast({ title: 'Sélection incomplète', description: 'Veuillez sélectionner le nombre correct de chambres pour chaque type.', variant: 'destructive' });
            return;
        }
        setIsAssigning(true);

        const allRoomIdsToUpdate = Object.values(selectedRooms).flat();
        
        try {
            // Update all selected rooms
            const updates = allRoomIdsToUpdate.map(roomId => 
                supabase.from('rooms').update({
                    guest_name: reservation.guest_name,
                    check_in: reservation.check_in,
                    check_out: reservation.check_out,
                    notes: reservation.notes,
                    status: 'Arrivée',
                }).eq('id', roomId)
            );

            await Promise.all(updates);
            
            // Update reservation status
            const { error: reservationUpdateError } = await supabase.from('reservations')
                .update({ status: 'assigned' })
                .eq('id', reservation.id);
            
            if (reservationUpdateError) throw reservationUpdateError;

            toast({ title: 'Succès !', description: 'Les chambres ont été assignées avec succès.' });
            if(fetchReservations) fetchReservations();
            onClose();

        } catch (error) {
            toast({ title: 'Erreur lors de l\'assignation', description: error.message, variant: 'destructive' });
        } finally {
            setIsAssigning(false);
        }
    };

    // Add new translations
    const i18nData = {
        assignRoomsFor: "Assigner les chambres pour",
        selectRooms: "Sélectionner {{count}} chambre(s)"
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('assignRoom')}</DialogTitle>
                    <DialogDescription>
                       {i18nData.assignRoomsFor} <span className='font-bold text-primary'>{reservation?.guest_name}</span>. {t('selectAvailableRoom')}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (reservation.reservation_items || []).map(item => (
                        <div key={item.room_type} className="p-4 border rounded-lg bg-muted/50">
                            <h3 className="font-semibold mb-2">{item.room_type} - ({i18nData.selectRooms.replace('{{count}}', item.quantity)})</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {(availableRooms[item.room_type] || []).length > 0 ? (
                                    availableRooms[item.room_type].map(room => {
                                        const isChecked = selectedRooms[item.room_type]?.includes(room.id);
                                        return (
                                            <div key={room.id} className="flex items-center space-x-2 p-2 border rounded-md bg-background">
                                                <Checkbox
                                                    id={`room-${room.id}`}
                                                    checked={isChecked}
                                                    onClick={() => handleCheckboxChange(item.room_type, room.id)}
                                                />
                                                <Label htmlFor={`room-${room.id}`} className="cursor-pointer">{room.room_number}</Label>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <p className="col-span-full text-sm text-muted-foreground">{t('noAvailableRooms')}</p>
                                )}
                            </div>
                            <p className="text-xs text-right mt-2 text-muted-foreground">
                                Sélectionné: {(selectedRooms[item.room_type] || []).length} / {item.quantity}
                            </p>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
                    <Button onClick={handleAssign} disabled={isAssigning || !isAssignmentComplete}>
                        {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                        {t('confirmAssignment')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
