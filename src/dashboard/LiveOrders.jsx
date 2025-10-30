import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Clock, Check, Utensils, Bike, Printer, MapPin, Phone, PackageCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import OpenLayersWrapper from '@/components/OpenLayersWrapper';

const OrderLocationDialog = ({ order, open, onOpenChange, allDrivers }) => {
    if (!order && !allDrivers) return null;

    const restaurantMarkers = order?.restaurant_id ? [{
      id: order.restaurant_id.id, 
      longitude: order.restaurant_id.longitude, 
      latitude: order.restaurant_id.latitude,
      name: order.restaurant_id.name,
      address: order.restaurant_id.address,
    }] : [];

    const driverMarker = order?.driver_lng && order?.driver_lat ? { position: [order.driver_lng, order.driver_lat], name: order.driver_id?.full_name || 'Driver', phone: order.driver_id?.phone } : undefined;
    const userMarker = order?.delivery_lng && order?.delivery_lat ? { position: [order.delivery_lng, order.delivery_lat], name: order.customer_name, phone: order.phone } : undefined;
    
    const showRouteToRestaurant = order && (order.status === 'ready' || order.status === 'out-for-delivery') && !!order.driver_id;
    const showRouteToCustomer = order && order.status === 'out-for-delivery';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{order ? `Delivery Route for Order #${order.id.slice(-6)}` : "All Active Drivers"}</DialogTitle>
                    <DialogDescription>{order ? order.delivery_address : "Real-time location of all active drivers."}</DialogDescription>
                </DialogHeader>
                <div className="flex-grow w-full rounded-lg overflow-hidden border mt-4">
                    <OpenLayersWrapper
                        restaurantMarkers={showRouteToCustomer ? [] : restaurantMarkers}
                        userMarker={userMarker}
                        driverMarker={driverMarker}
                        allDriversMarkers={allDrivers}
                        showRouteToRestaurant={showRouteToRestaurant}
                        showRouteToCustomer={showRouteToCustomer}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};


const LiveOrders = ({ orders, onFinalizeOrder }) => {
  const [selectedOrderForMap, setSelectedOrderForMap] = useState(null);
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [allDrivers, setAllDrivers] = useState([]);

  useEffect(() => {
    const fetchActiveDrivers = async () => {
        const { data, error } = await supabase
            .from('driver_locations')
            .select('*, driver:driver_id(full_name, phone)')
            .eq('is_active', true);
        
        if (error) {
            console.error("Error fetching active drivers:", error);
        } else {
            const driversWithProfile = data.map(d => ({...d, full_name: d.driver.full_name, phone: d.driver.phone}));
            setAllDrivers(driversWithProfile);
        }
    };

    fetchActiveDrivers();

    const channel = supabase
        .channel('public:driver_locations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, (payload) => {
            fetchActiveDrivers();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({ title: "Error updating order", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order Updated", description: `Order status changed to ${newStatus}` });
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-400 bg-yellow-50">Pending</Badge>;
      case 'preparing': return <Badge variant="outline" className="text-blue-600 border-blue-400 bg-blue-50">Preparing</Badge>;
      case 'ready': return <Badge variant="outline" className="text-green-600 border-green-400 bg-green-50">Ready</Badge>;
      case 'out-for-delivery': return <Badge variant="outline" className="text-purple-600 border-purple-400 bg-purple-50">Out for Delivery</Badge>;
      case 'completed': return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const renderOrderActions = (order) => {
    switch(order.status) {
        case 'pending':
            return <Button onClick={() => updateOrderStatus(order.id, 'preparing')} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white"><Utensils className="mr-2 h-4 w-4" />Start Preparing</Button>;
        case 'preparing':
            return (
              <Button onClick={() => updateOrderStatus(order.id, 'ready')} size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                {order.order_type === 'delivery' ? <><PackageCheck className="mr-2 h-4 w-4" />Ready for Pickup</> : <><Check className="mr-2 h-4 w-4"/>Mark as Ready</>}
              </Button>
            );
        case 'ready':
             if (order.order_type === 'delivery') {
                return <p className="text-sm text-green-600 font-semibold flex items-center gap-2"><Clock className="w-4 h-4"/> Waiting for driver...</p>
             }
             return <Button onClick={() => onFinalizeOrder(order)} size="sm" variant="secondary"><Printer className="mr-2 h-4 w-4" />Finalize & Print</Button>;
        case 'out-for-delivery':
             return <Button onClick={() => onFinalizeOrder(order)} size="sm" variant="secondary"><Printer className="mr-2 h-4 w-4" />Finalize & Print</Button>;
        default:
            return null;
    }
  }

  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Live Orders</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setShowAllDrivers(true)}>
            <Bike className="mr-2 h-4 w-4" /> View All Drivers
        </Button>
      </CardHeader>
      <CardContent>
      {activeOrders.length === 0 ? (
        <div className="text-center py-12"><Clock className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" /><h3 className="text-xl font-semibold text-muted-foreground mb-2">No Active Orders</h3><p className="text-muted-foreground">New orders will appear here in real-time.</p></div>
      ) : (
        <div className="space-y-4">
          {activeOrders.map((order) => (
            <motion.div key={order.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-background rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-foreground">Order #{order.id.slice(-6)}</h3>
                  <div>{getStatusBadge(order.status)}</div>
                  {order.order_type === 'delivery' && <Badge variant="default" className="bg-purple-500">Delivery</Badge>}
                  {order.order_type === 'dine-in' && <Badge variant="default" className="bg-orange-500">Dine-in</Badge>}
                  {order.order_type === 'pos' && <Badge variant="default" className="bg-gray-500">POS</Badge>}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">${parseFloat(order.total).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-muted-foreground mb-2">
                  Customer: {order.customer_name}
                  {order.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {order.phone}</span>}
                  {order.order_type === 'dine-in' ? ` | Table: ${order.table_number}`: ''}
                </p>
                {order.order_type === 'delivery' && (
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-foreground flex items-center gap-2"><MapPin className="w-4 h-4"/> Delivery Address:</p>
                                <p>{order.delivery_address}</p>
                            </div>
                            {order.restaurant_id && (order.status === 'ready' || order.status === 'out-for-delivery') && order.driver_id && (
                                <Button variant="outline" size="sm" onClick={() => setSelectedOrderForMap(order)}>
                                    View Map
                                </Button>
                            )}
                        </div>
                    </div>
                )}
                <div className="text-sm text-muted-foreground mt-2">
                  <p>Items: {order.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {renderOrderActions(order)}
                {(order.status === 'pending' || order.status === 'preparing') && (
                  <Button onClick={() => updateOrderStatus(order.id, 'cancelled')} size="sm" variant="destructive">Cancel</Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      </CardContent>
    </Card>
    <OrderLocationDialog 
        order={selectedOrderForMap}
        open={!!selectedOrderForMap}
        onOpenChange={() => setSelectedOrderForMap(null)}
    />
    <OrderLocationDialog 
        open={showAllDrivers}
        onOpenChange={() => setShowAllDrivers(false)}
        allDrivers={allDrivers}
    />
    </>
  );
};

export default LiveOrders;
