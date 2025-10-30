import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Edit, Plus, Trash2, Save, Upload } from 'lucide-react';

const MenuManagement = ({ menuItems, restaurantId }) => {
  const { user } = useAuth();
  const [isEditMenuItemOpen, setIsEditMenuItemOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [menuItemFile, setMenuItemFile] = useState(null);
  const [menuItemPreview, setMenuItemPreview] = useState('');
  const menuItemInputRef = useRef(null);

  const categories = ['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Specials'];

  const uploadImage = async (file, bucket, path) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
  };

  const handleSaveMenuItem = async () => {
    if (!editingMenuItem) return;
    try {
      let finalImageUrl = editingMenuItem.image_url;
      if (menuItemFile) {
        const imagePath = `${user.id}/menu-item-${Date.now()}`;
        finalImageUrl = await uploadImage(menuItemFile, 'logos', imagePath);
      }

      const menuItemData = {
        ...editingMenuItem,
        price: parseFloat(editingMenuItem.price) || 0,
        restaurant_id: restaurantId,
        image_url: finalImageUrl,
      };
      
      let error;
      if (menuItemData.id) {
        const { id, ...updateData } = menuItemData;
        const { error: updateError } = await supabase.from('menu_items').update(updateData).eq('id', id);
        error = updateError;
      } else {
        const { id, ...insertData } = menuItemData;
        const { error: insertError } = await supabase.from('menu_items').insert([insertData]);
        error = insertError;
      }

      if (error) throw error;

      toast({ title: 'Success', description: `Menu item ${menuItemData.id ? 'updated' : 'added'}.` });
      setIsEditMenuItemOpen(false);
      setEditingMenuItem(null);
      setMenuItemFile(null);
      setMenuItemPreview('');
    } catch (error) {
      toast({ title: 'Error saving menu item', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (error) {
      toast({ title: 'Error deleting menu item', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Menu item deleted.' });
    }
  };

  const handleMenuItemFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMenuItemFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setMenuItemPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Menu Management</CardTitle>
          <Dialog open={isEditMenuItemOpen} onOpenChange={setIsEditMenuItemOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingMenuItem({ name: '', description: '', price: '', category: 'Main Course', image_url: '' }); setMenuItemPreview(''); setIsEditMenuItemOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMenuItem?.id ? 'Edit' : 'Add'} Menu Item</DialogTitle>
                <DialogDescription>Fill in the details for the menu item.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input placeholder="Name" value={editingMenuItem?.name || ''} onChange={(e) => setEditingMenuItem({...editingMenuItem, name: e.target.value})} />
                <Textarea placeholder="Description" value={editingMenuItem?.description || ''} onChange={(e) => setEditingMenuItem({...editingMenuItem, description: e.target.value})} />
                <Input placeholder="Price" type="number" value={editingMenuItem?.price || ''} onChange={(e) => setEditingMenuItem({...editingMenuItem, price: e.target.value})} />
                <select value={editingMenuItem?.category || 'Main Course'} onChange={(e) => setEditingMenuItem({...editingMenuItem, category: e.target.value})} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm">
                   {categories.map(category => (<option key={category} value={category}>{category}</option>))}
                </select>
                <div>
                  <Label htmlFor="menu-item-image">Image</Label>
                  <Input type="file" id="menu-item-image" ref={menuItemInputRef} onChange={handleMenuItemFileChange} className="hidden" accept="image/*" />
                  <Button onClick={() => menuItemInputRef.current.click()} variant="outline" className="w-full"><Upload className="w-4 h-4 mr-2" /> Upload Image</Button>
                  {menuItemPreview && <img src={menuItemPreview} alt="preview" className="mt-2 w-20 h-20 rounded-lg object-cover" />}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveMenuItem}><Save className="mr-2 h-4 w-4" /> Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {menuItems.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-4">
                {item.image_url && <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-md object-cover" />}
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">${parseFloat(item.price).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" onClick={() => { setEditingMenuItem(item); setMenuItemPreview(item.image_url); setIsEditMenuItemOpen(true); }}><Edit className="w-4 h-4" /></Button>
                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteMenuItem(item.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuManagement;
