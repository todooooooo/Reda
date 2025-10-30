import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BellRing, X } from 'lucide-react';

const NewOrderAlert = ({ order, onClose }) => {

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 10000); // Auto-close after 10 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const getOrderDescription = () => {
    let description = `A new order (#${order.id}) has been placed.`;
    if (order.order_type === 'dine-in') {
      description += ` For table ${order.table_number}.`;
    } else if (order.order_type === 'delivery') {
      description += ' For delivery.';
    } else if (order.order_type === 'pos') {
        description += ' From POS terminal.'
    }
    description += ` Total: ${parseFloat(order.total).toFixed(2)}.`;
    return description;
  }

  return (
    <motion.div
      className="fixed top-5 right-5 z-[100]"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100, transition: { duration: 0.3 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      layout
    >
      <Card className="w-80 shadow-2xl border-primary neon-glow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2"><BellRing className="text-primary animate-pulse" /> New Order!</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {getOrderDescription()}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NewOrderAlert;
