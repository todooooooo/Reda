import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Key, Loader2, Calendar, User, FileText, Search } from 'lucide-react';
import { ReservationEditDialog } from './ReservationEditDialog';
import { AssignRoomDialog } from './AssignRoomDialog';
import { useNavigate } from 'react-router-dom';

const ReservationManager = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('reservations')
      .select(`
        *,
        reservation_items (
          *
        )
      `)
      .order('check_in', { ascending: true });

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setReservations(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReservations();
    const reservationsChannel = supabase.channel('public:reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, fetchReservations)
      .subscribe();
    const itemsChannel = supabase.channel('public:reservation_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservation_items' }, fetchReservations)
      .subscribe();

    return () => {
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [fetchReservations]);

  const filteredReservations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return reservations.filter(res => {
      // Search filter
      const searchMatch = searchTerm === '' || res.guest_name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      // Date filter
      if (dateFilter === 'all') return true;
      const checkIn = new Date(res.check_in);
      
      if (dateFilter === 'today') {
        return checkIn.getTime() === today.getTime();
      }
      if (dateFilter === 'this_week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        return checkIn >= startOfWeek && checkIn <= endOfWeek;
      }
      if (dateFilter === 'this_month') {
        return checkIn.getFullYear() === today.getFullYear() && checkIn.getMonth() === today.getMonth();
      }
      
      return true;
    });
  }, [reservations, searchTerm, dateFilter]);

  const handleOpenEditDialog = (reservation = null) => {
    setSelectedReservation(reservation);
    setIsEditDialogOpen(true);
  };
  
  const handleOpenAssignDialog = (reservation) => {
    setSelectedReservation(reservation);
    setIsAssignDialogOpen(true);
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');

  const renderRoomRequests = (items) => {
    if (!items || items.length === 0) return "-";
    return items.map(item => `${item.quantity} x ${item.room_type}`).join(', ');
  }

  if (loading) {
    return <div className="flex items-center justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="ml-4">Chargement des réservations...</p></div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <CardTitle className="flex-shrink-0">{t('reservationManagement')}</CardTitle>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('searchByGuest')}
                className="pl-9 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('filterByDate')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allReservations')}</SelectItem>
                <SelectItem value="today">{t('today')}</SelectItem>
                <SelectItem value="this_week">{t('thisWeek')}</SelectItem>
                <SelectItem value="this_month">{t('thisMonth')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => handleOpenEditDialog()} className="flex-shrink-0">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('addReservation')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><User className="inline-block h-4 w-4 mr-1"/>{t('guestName')}</TableHead>
                  <TableHead><Calendar className="inline-block h-4 w-4 mr-1"/>{t('checkIn')}</TableHead>
                  <TableHead><Calendar className="inline-block h-4 w-4 mr-1"/>{t('checkOut')}</TableHead>
                  <TableHead>{t('requestedRooms')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.length > 0 ? (
                  filteredReservations.map(res => (
                    <TableRow key={res.id}>
                      <TableCell className="font-medium">{res.guest_name}</TableCell>
                      <TableCell>{formatDate(res.check_in)}</TableCell>
                      <TableCell>{formatDate(res.check_out)}</TableCell>
                      <TableCell>{renderRoomRequests(res.reservation_items)}</TableCell>
                      <TableCell>
                        <Badge variant={res.status === 'assigned' ? 'success' : 'secondary'}>
                          {t(res.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                         {res.status === 'unassigned' && (
                          <Button size="sm" onClick={() => handleOpenAssignDialog(res)}>
                            <Key className="mr-2 h-4 w-4" />
                            {t('assignRoom')}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => navigate(`/invoice/${res.id}`)}>
                            <FileText className="mr-2 h-4 w-4" />
                            {t('invoice')}
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleOpenEditDialog(res)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">{t('noReservationsMatch')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {isEditDialogOpen && (
        <ReservationEditDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          reservation={selectedReservation}
          fetchReservations={fetchReservations}
        />
      )}
      
      {isAssignDialogOpen && selectedReservation && (
        <AssignRoomDialog
          isOpen={isAssignDialogOpen}
          onClose={() => setIsAssignDialogOpen(false)}
          reservation={selectedReservation}
          fetchReservations={fetchReservations}
        />
      )}
    </>
  );
};

export default ReservationManager;
