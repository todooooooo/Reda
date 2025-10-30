import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { X, Plus, Minus, Search, Printer, Loader2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

const ReceiptToPrint = React.forwardRef(({ order, restaurant }, ref) => {
    if (!order) return null;
    return (
        <div ref={ref} className="p-4 font-mono text-xs text-black bg-white">
            <div className="text-center mb-4">
                <h3 className="text-lg font-bold">{restaurant.name}</h3>
                {restaurant.address && <p>{restaurant.address}</p>}
                {restaurant.phone && <p>Phone: {restaurant.phone}</p>}
            </div>
            <div className="border-t border-b border-dashed border-black my-2 py-2">
                <p>Order ID: {order.id}</p>
                <p>Date: {new Date(order.created_at).toLocaleString()}</p>
                <p>Type: {order.order_type === 'pos' ? 'In-Store Purchase' : 'Dine-in'}</p>
            </div>
            <table className="w-full">
                <thead>
                <tr>
                    <th className="text-left">Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Price</th>
                </tr>
                </thead>
                <tbody>
                {order.items.map(item => (
                    <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-right">${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            <div className="border-t border-dashed border-black mt-2 pt-2 text-right">
                <p className="font-bold">Total: ${parseFloat(order.total).toFixed(2)}</p>
            </div>
            <p className="text-center mt-4">Thank you for your visit!</p>
        </div>
    );
});


const PointOfSale = ({ restaurant, menuItems, onClose, onOrderPlaced, initialOrder }) => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const receiptRef = useRef(null);

  useEffect(() => {
    if (initialOrder) {
        setCart(initialOrder.items || []);
    }
  }, [initialOrder]);


  const handlePrint = useReactToPrint({
      content: () => receiptRef.current,
      onAfterPrint: () => {
          setReceiptData(null); // Clear receipt after printing
          onClose();
      }
  });

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId, amount) => {
    setCart((prev) => {
      const updatedCart = prev.map((i) => i.id === itemId ? { ...i, quantity: i.quantity + amount } : i);
      return updatedCart.filter(i => i.quantity > 0);
    });
  };

  const filteredItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleFinalizeOrder = async () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setLoading(true);

    if (initialOrder) {
        const { data, error } = await supabase.from('orders').update({ status: 'completed' }).eq('id', initialOrder.id).select().single();
        setLoading(false);
        if (error) {
            toast({ title: "Failed to Finalize", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Order Finalized!" });
            setReceiptData(data); // Set data for printing
            onOrderPlaced(); // This will trigger a data refetch in Dashboard
        }
    } else {
        const orderData = {
          restaurant_id: restaurant.id,
          customer_name: "In-store Customer",
          table_number: "POS",
          items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
          total: totalPrice,
          status: 'completed',
          order_type: 'pos',
        };
        
        const { data, error } = await supabase.from('orders').insert([orderData]).select().single();

        setLoading(false);
        if (error) {
          toast({ title: "Order Failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Order Finalized!" });
          setReceiptData(data); // Set data for printing
          onOrderPlaced(); // This will trigger a data refetch in Dashboard
          setCart([]);
        }
    }
  };

  useEffect(() => {
      if(receiptData) {
          handlePrint();
      }
  }, [receiptData, handlePrint])

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-card text-card-foreground rounded-xl w-full max-w-5xl h-[90vh] flex flex-col"
        >
          <header className="p-4 border-b flex items-center justify-between">
            <h2 className="text-2xl font-bold">{initialOrder ? `Finalize Order #${initialOrder.id}`: 'POS Terminal'}</h2>
            <Button onClick={onClose} variant="ghost" size="icon"><X /></Button>
          </header>

          <div className="flex-1 flex overflow-hidden">
            {/* Menu Items */}
            <div className="w-3/5 p-4 border-r overflow-y-auto">
              <div className="sticky top-0 bg-card py-2 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    placeholder="Search for products..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    disabled={!!initialOrder}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredItems.map(item => (
                  <Card key={item.id} className={`p-2 flex flex-col text-center ${!!initialOrder ? 'cursor-not-allowed opacity-60' : 'cursor-pointer card-hover'}`} onClick={() => !initialOrder && addToCart(item)}>
                    <img src={item.image_url} alt={item.name} className="w-full h-24 object-cover rounded-md mb-2" />
                    <p className="text-sm font-semibold flex-1">{item.name}</p>
                    <p className="text-xs text-secondary">${parseFloat(item.price).toFixed(2)}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Cart */}
            <div className="w-2/5 p-4 flex flex-col">
              <h3 className="text-xl font-bold mb-4">Current Order</h3>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center mt-8">Your cart is empty.</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id || item.name} className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">${parseFloat(item.price).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={() => !initialOrder && updateQuantity(item.id, -1)} size="icon" variant="outline" className="h-7 w-7" disabled={!!initialOrder}><Minus className="h-4 w-4" /></Button>
                        <span>{item.quantity}</span>
                        <Button onClick={() => !initialOrder && updateQuantity(item.id, 1)} size="icon" variant="outline" className="h-7 w-7" disabled={!!initialOrder}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-auto border-t pt-4 space-y-4">
                <div className="flex justify-between font-bold text-xl">
                  <span>Total</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <Button onClick={handleFinalizeOrder} disabled={loading || cart.length === 0} size="lg" className="w-full text-lg">
                  {loading ? <Loader2 className="animate-spin mr-2" /> : <Printer className="mr-2" />}
                  Finalize & Print
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="hidden">
        <ReceiptToPrint ref={receiptRef} order={receiptData} restaurant={restaurant} />
      </div>
    </>
  );
};

export default PointOfSale;
