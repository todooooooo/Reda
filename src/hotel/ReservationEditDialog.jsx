import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, PlusCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Textarea } from '../ui/textarea';

const roomTypes = ['Single', 'Double', 'Triple', 'Quatre'];
const boardBases = ['BB', 'DP', 'PC'];

export const ReservationEditDialog = ({ isOpen, onClose, reservation, fetchReservations }) => {
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [totalGuests, setTotalGuests] = useState(1);
    const [notes, setNotes] = useState('');
    const [roomRequests, setRoomRequests] = useState([]);

    useEffect(() => {
        const fetchItems = async (reservationId) => {
            const { data, error } = await supabase
                .from('reservation_items')
                .select('*')
                .eq('reservation_id', reservationId);
            
            if (!error && data) {
                setRoomRequests(data.map(item => ({...item, client_id: Math.random()})));
            }
        };

        if (reservation) {
            setGuestName(reservation.guest_name);
            setCheckIn(reservation.check_in);
            setCheckOut(reservation.check_out);
            setTotalGuests(reservation.total_guests || 1);
            setNotes(reservation.notes || '');
            fetchItems(reservation.id);
        } else {
            setGuestName('');
            setCheckIn('');
            setCheckOut('');
            setTotalGuests(1);
            setNotes('');
            setRoomRequests([{ client_id: Math.random(), room_type: 'Double', quantity: 1, price_per_room: '', board_basis: 'BB' }]);
        }
    }, [reservation, isOpen]);

    const handleRoomRequestChange = (index, field, value) => {
        const newRequests = [...roomRequests];
        newRequests[index][field] = value;
        setRoomRequests(newRequests);
    };

    const addRoomRequest = () => {
        setRoomRequests([...roomRequests, { client_id: Math.random(), room_type: 'Single', quantity: 1, price_per_room: '', board_basis: 'BB' }]);
    };

    const removeRoomRequest = (index) => {
        const newRequests = roomRequests.filter((_, i) => i !== index);
        setRoomRequests(newRequests);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Upsert reservation
            let reservation_id;
            if (reservation?.id) {
                const { data, error } = await supabase.from('reservations').update({
                    guest_name: guestName,
                    check_in: checkIn,
                    check_out: checkOut,
                    total_guests: totalGuests,
                    notes: notes,
                }).eq('id', reservation.id).select().single();
                if (error) throw error;
                reservation_id = data.id;
            } else {
                 const { data, error } = await supabase.from('reservations').insert({
                    guest_name: guestName,
                    check_in: checkIn,
                    check_out: checkOut,
                    total_guests: totalGuests,
                    notes: notes,
                    status: 'unassigned'
                }).select().single();
                if (error) throw error;
                reservation_id = data.id;
            }

            // Get IDs of existing items for this reservation
            const { data: existingItems } = await supabase.from('reservation_items').select('id').eq('reservation_id', reservation_id);
            const existingItemIds = existingItems?.map(item => item.id) || [];
            
            const currentItemIds = [];

            // Upsert room requests
            const itemsToUpsert = roomRequests.map(item => {
                const isNew = !item.id;
                const upsertData = {
                    reservation_id: reservation_id,
                    room_type: item.room_type,
                    quantity: item.quantity,
                    price_per_room: item.price_per_room,
                    board_basis: item.board_basis,
                };
                // Only add 'id' if it exists to perform an update
                if (!isNew) {
                    upsertData.id = item.id;
                    currentItemIds.push(item.id);
                }
                return upsertData;
            });
            
            const { error: itemsError } = await supabase.from('reservation_items').upsert(itemsToUpsert);
            if (itemsError) throw itemsError;

            // Delete removed items
            const idsToDelete = existingItemIds.filter(id => !currentItemIds.includes(id));
            if (idsToDelete.length > 0) {
                 const { error: deleteError } = await supabase.from('reservation_items').delete().in('id', idsToDelete);
                 if (deleteError) throw deleteError;
            }
            
            toast({ title: "Succès", description: "Réservation enregistrée." });
            fetchReservations();
            onClose();

        } catch (error) {
            toast({ title: "Erreur", description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const title = reservation ? t('editReservation') : t('addReservation');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{t('updateReservationInfo')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="guest_name">{t('guestName')}</Label>
                            <Input id="guest_name" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="total_guests">{t('totalGuests')}</Label>
                            <Input id="total_guests" type="number" min="1" value={totalGuests} onChange={(e) => setTotalGuests(parseInt(e.target.value))} required />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="check_in">{t('checkIn')}</Label>
                            <Input id="check_in" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="check_out">{t('checkOut')}</Label>
                            <Input id="check_out" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required/>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <Label>{t('requestedRooms')}</Label>
                        {roomRequests.map((req, index) => (
                            <div key={req.client_id} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                                <div className="col-span-12 sm:col-span-3 space-y-1">
                                    <Label className="text-xs">{t('roomType')}</Label>
                                    <Select value={req.room_type} onValueChange={(v) => handleRoomRequestChange(index, 'room_type', v)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>{roomTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-6 sm:col-span-2 space-y-1">
                                    <Label className="text-xs">{t('quantity')}</Label>
                                    <Input type="number" min="1" value={req.quantity} onChange={(e) => handleRoomRequestChange(index, 'quantity', parseInt(e.target.value))} />
                                </div>
                                 <div className="col-span-6 sm:col-span-2 space-y-1">
                                    <Label className="text-xs">{t('pricePerRoom')}</Label>
                                    <Input type="number" value={req.price_per_room} onChange={(e) => handleRoomRequestChange(index, 'price_per_room', e.target.value)} />
                                </div>
                                <div className="col-span-12 sm:col-span-3 space-y-1">
                                    <Label className="text-xs">{t('boardBasis')}</Label>
                                    <Select value={req.board_basis} onValueChange={(v) => handleRoomRequestChange(index, 'board_basis', v)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>{boardBases.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-12 sm:col-span-2 flex justify-end">
                                    <Button variant="ghost" size="icon" onClick={() => removeRoomRequest(index)} disabled={roomRequests.length <= 1}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addRoomRequest}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('addRoomRequest')}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">{t('notes')}</Label>
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informations additionnelles, demandes spéciales..."/>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {t('save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
