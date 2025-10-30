import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Edit, Eye, QrCode, Upload, BarChart2, MapPin } from 'lucide-react';
import MapTilerWrapper from '@/components/MapTilerWrapper';

const DashboardHeader = ({ restaurant, onUpdate, onShowQR }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditRestaurantOpen, setIsEditRestaurantOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const logoInputRef = useRef(null);
  const [mapPosition, setMapPosition] = useState(null);

  const handlePositionChange = (newPos) => {
    setMapPosition(newPos);
    if (editingRestaurant) {
        setEditingRestaurant(prev => ({
            ...prev,
            latitude: newPos.lat,
            longitude: newPos.lng
        }));
    }
  };

  const openEditDialog = () => {
    const initialRestaurantState = {...restaurant};
    setEditingRestaurant(initialRestaurantState);
    setLogoPreview(restaurant.logo_url);
    if (initialRestaurantState.latitude && initialRestaurantState.longitude) {
        setMapPosition({ lat: initialRestaurantState.latitude, lng: initialRestaurantState.longitude });
    } else {
        setMapPosition({ lat: 31.6295, lng: -7.9811 });
    }
    setIsEditRestaurantOpen(true);
  }

  const uploadImage = async (file, bucket, path) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
  };

  const handleUpdateRestaurant = async () => {
    if (!editingRestaurant) return;
    try {
      let finalLogoUrl = editingRestaurant.logo_url;
      if (logoFile) {
        const logoPath = `${user.id}/logo-${Date.now()}`;
        finalLogoUrl = await uploadImage(logoFile, 'logos', logoPath);
      }
      
      const { menu_items, ...updateData } = { ...editingRestaurant, logo_url: finalLogoUrl };
      const { error } = await supabase.from('restaurants').update(updateData).eq('id', restaurant.id);
      if (error) throw error;

      toast({ title: 'Success', description: 'Restaurant details updated.' });
      setIsEditRestaurantOpen(false);
      setLogoFile(null);
      setLogoPreview('');
      onUpdate();
    } catch (error) {
      toast({ title: 'Error updating restaurant', description: error.message, variant: 'destructive' });
    }
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
      <div className="flex items-center">
        <img src={restaurant.logo_url || "https://horizons-cdn.hostinger.com/a742ae95-d6f8-4ada-920b-98e40a57ec08/img_4498-LxpH4.jpeg"} alt="Logo" className="w-16 h-16 rounded-lg mr-4 object-cover border-2 border-primary/20"/>
        <div>
          <h1 className="text-4xl font-black font-heading text-foreground">{restaurant.name}</h1>
          <p className="text-muted-foreground">Welcome to your Dashboard</p>
        </div>
        <Dialog open={isEditRestaurantOpen} onOpenChange={setIsEditRestaurantOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-2" onClick={openEditDialog}>
              <Edit className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Restaurant</DialogTitle>
              <DialogDescription>Update your restaurant's information and location.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={editingRestaurant?.name || ''} onChange={(e) => setEditingRestaurant({...editingRestaurant, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="logo" className="text-right">Logo</Label>
                <div className="col-span-3">
                  <Input type="file" id="logo" ref={logoInputRef} onChange={handleLogoFileChange} className="hidden" accept="image/*" />
                  <Button onClick={() => logoInputRef.current.click()} variant="outline" className="w-full"><Upload className="w-4 h-4 mr-2" /> Change Logo</Button>
                  {logoPreview && <img src={logoPreview} alt="preview" className="mt-2 w-20 h-20 rounded-lg object-cover" />}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea id="description" value={editingRestaurant?.description || ''} onChange={(e) => setEditingRestaurant({...editingRestaurant, description: e.target.value})} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="address" className="text-right pt-2">Address</Label>
                <Input id="address" value={editingRestaurant?.address || ''} onChange={(e) => setEditingRestaurant({...editingRestaurant, address: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2 flex gap-2 items-center"><MapPin className="w-4 h-4"/> Location</Label>
                <div className="col-span-3">
                    <div className="h-64 w-full rounded-lg overflow-hidden z-0 border">
                        {isEditRestaurantOpen && mapPosition && <MapTilerWrapper
                            center={mapPosition ? [mapPosition.lng, mapPosition.lat] : undefined}
                            zoom={13}
                            markerPosition={mapPosition ? [mapPosition.lng, mapPosition.lat] : undefined}
                            onPositionChange={handlePositionChange}
                            isPicker={true}
                        />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Click on the map to update location.</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateRestaurant}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => navigate('/analytics')} variant="outline"><BarChart2 className="w-4 h-4 mr-2" />Detailed Analytics</Button>
        <Button onClick={() => navigate(`/menu/${restaurant.id}`)} variant="outline"><Eye className="w-4 h-4 mr-2" />View Menu</Button>
        <Button onClick={onShowQR} variant="default"><QrCode className="w-4 h-4 mr-2" />Show QR</Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
