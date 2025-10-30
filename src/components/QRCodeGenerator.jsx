import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { X, Download, Share2, QrCode } from 'lucide-react';

function QRCodeGenerator({ restaurantId, restaurantName, onClose }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateQRCode();
  }, [restaurantId]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      const menuUrl = `${window.location.origin}/menu/${restaurantId}`;
      
      // Using QR Server API for QR code generation
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}`;
      setQrCodeUrl(qrUrl);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${restaurantName}-menu-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success!",
        description: "QR code downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive"
      });
    }
  };

  const shareQRCode = async () => {
    const menuUrl = `${window.location.origin}/menu/${restaurantId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${restaurantName} Menu`,
          text: `Check out the menu for ${restaurantName}`,
          url: menuUrl
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(menuUrl);
        toast({
          title: "Link Copied!",
          description: "Menu link has been copied to clipboard"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-effect border-purple-500/20 p-8 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <QrCode className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-semibold text-white">QR Code Menu</h2>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-300 mb-4">
              Customers can scan this QR code to view your menu and place orders
            </p>
            
            {loading ? (
              <div className="w-64 h-64 mx-auto bg-white/10 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg inline-block">
                <img
                  src={qrCodeUrl}
                  alt="Menu QR Code"
                  className="w-64 h-64"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={downloadQRCode}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>
            
            <Button
              onClick={shareQRCode}
              variant="outline"
              className="w-full border-purple-400/50 text-purple-300 hover:bg-purple-400/10"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Menu Link
            </Button>
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-blue-300 text-sm">
              <strong>Tip:</strong> Print this QR code and place it on your tables so customers can easily access your menu!
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default QRCodeGenerator;
