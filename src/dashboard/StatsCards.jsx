import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart3, Clock, DollarSign, UtensilsCrossed } from 'lucide-react';

const StatsCards = ({ totalOrders, todayOrders, totalRevenue, menuItemsCount }) => {
  const stats = [
    { title: "Total Orders", value: totalOrders, icon: BarChart3, color: "text-primary", bgColor: "bg-primary/10" },
    { title: "Today's Orders", value: todayOrders, icon: Clock, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { title: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-secondary", bgColor: "bg-secondary/10" },
    { title: "Menu Items", value: menuItemsCount, icon: UtensilsCrossed, color: "text-green-500", bgColor: "bg-green-500/10" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">{stat.title}</p>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
