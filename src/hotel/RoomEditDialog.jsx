import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const roomStatuses = ['Propre', 'Sale', 'Occupée', 'Arrivée', 'Départ', 'Recouche', 'Hors service', 'Manque'];
const roomTypes = ['Single', 'Double', 'Triple', 'Quatre'];
const boardBases = ['BB', 'DP', 'PC'];
const paymentMethods = ['Cash', 'Credit Card', 'Bank Transfer', 'On Account'];

export const RoomEditDialog = ({ isOpen, onClose, room, onSave }) => {
    const [editedRoom, setEditedRoom] = useState(room);
    const [isSaving, setIsSaving] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        setEditedRoom(room);
    }, [room]);

    const handleChange = (field, value) => {
        if ((field === 'check_in' || field === 'check_out') && value === '') {
            setEditedRoom(prev => ({ ...prev, [field]: null }));
        } else {
            setEditedRoom(prev => ({ ...prev, [field]: value }));
        }
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        await onSave(editedRoom);
        setIsSaving(false);
    };

    if (!room) return null;
    
    const checkInDate = editedRoom.check_in ? new Date(editedRoom.check_in).toISOString().split('T')[0] : '';
    const checkOutDate = editedRoom.check_out ? new Date(editedRoom.check_out).toISOString().split('T')[0] : '';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{t('editRoom')} {room.room_number}</DialogTitle>
                    <DialogDescription>{t('updateRoomInfo')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">{t('status')}</Label>
                        <div className="col-span-3">
                            <Select value={editedRoom.status || 'Propre'} onValueChange={(value) => handleChange('status', value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{roomStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="room_type" className="text-right">{t('roomType')}</Label>
                        <div className="col-span-3">
                            <Select value={editedRoom.room_type || ''} onValueChange={(value) => handleChange('room_type', value)}>
                                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                <SelectContent>{roomTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="board_basis" className="text-right">{t('boardBasis')}</Label>
                        <div className="col-span-3">
                            <Select value={editedRoom.board_basis || ''} onValueChange={(value) => handleChange('board_basis', value)}>
                                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                <SelectContent>{boardBases.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="guest_name" className="text-right">{t('guestName')}</Label>
                        <Input id="guest_name" value={editedRoom.guest_name || ''} onChange={(e) => handleChange('guest_name', e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="check_in" className="text-right">{t('arrival')}</Label>
                        <Input id="check_in" type="date" value={checkInDate} onChange={(e) => handleChange('check_in', e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="check_out" className="text-right">{t('departure')}</Label>
                        <Input id="check_out" type="date" value={checkOutDate} onChange={(e) => handleChange('check_out', e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">{t('price')}</Label>
                        <Input id="price" type="number" value={editedRoom.price || ''} onChange={(e) => handleChange('price', e.target.value)} className="col-span-3" placeholder="ex: 150.00" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="payment_method" className="text-right">{t('paymentMethod')}</Label>
                        <div className="col-span-3">
                            <Select value={editedRoom.payment_method || ''} onValueChange={(value) => handleChange('payment_method', value)}>
                                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                <SelectContent>{paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">{t('notes')}</Label>
                        <Textarea id="notes" value={editedRoom.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} className="col-span-3" placeholder="Informations additionnelles..."/>
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
