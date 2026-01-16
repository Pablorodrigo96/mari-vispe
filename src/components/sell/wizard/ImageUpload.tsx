import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

const ImageUpload = ({ images, onChange, maxImages = 10 }: ImageUploadProps) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Máximo de ${maxImages} imagens permitido`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);
    setUploadProgress(0);

    const newImageUrls: string[] = [];
    
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem válida`);
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} é maior que 5MB`);
        continue;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);

        newImageUrls.push(urlData.publicUrl);
        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }

    if (newImageUrls.length > 0) {
      onChange([...images, ...newImageUrls]);
      toast.success(`${newImageUrls.length} imagem(s) enviada(s) com sucesso`);
    }

    setIsUploading(false);
    setUploadProgress(0);
    
    // Reset input
    e.target.value = '';
  }, [user, images, maxImages, onChange]);

  const handleRemoveImage = useCallback(async (imageUrl: string) => {
    // Extract path from URL
    const urlParts = imageUrl.split('/listing-images/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      
      try {
        await supabase.storage
          .from('listing-images')
          .remove([filePath]);
      } catch (error) {
        console.error('Error removing file:', error);
      }
    }

    onChange(images.filter((img) => img !== imageUrl));
    toast.success('Imagem removida');
  }, [images, onChange]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';
      
      // Create a DataTransfer to simulate file input
      const dataTransfer = new DataTransfer();
      Array.from(files).forEach(file => dataTransfer.items.add(file));
      
      const event = {
        target: { files: dataTransfer.files, value: '' }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleFileSelect(event);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <ImageIcon className="w-5 h-5 text-accent" />
        <span>Fotos do Negócio</span>
        <span className="text-sm font-normal text-muted-foreground">
          ({images.length}/{maxImages})
        </span>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent/50 transition-colors"
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={isUploading || images.length >= maxImages}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 mx-auto text-accent animate-spin" />
            <p className="text-sm text-muted-foreground">
              Enviando... {Math.round(uploadProgress)}%
            </p>
            <div className="w-full max-w-xs mx-auto h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Arraste imagens ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG ou WEBP • Máximo 5MB por imagem
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((imageUrl, index) => (
            <div
              key={imageUrl}
              className="relative aspect-square rounded-lg overflow-hidden group"
            >
              <img
                src={imageUrl}
                alt={`Imagem ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {index === 0 && (
                <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded">
                  Principal
                </span>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveImage(imageUrl)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        A primeira imagem será usada como foto principal do anúncio
      </p>
    </div>
  );
};

export default ImageUpload;