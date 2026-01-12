import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepMediaProps {
  data: {
    images: string[];
  };
  onChange: (field: string, value: string[]) => void;
}

const StepMedia = ({ data, onChange }: StepMediaProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [data.images]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    const newImages = imageFiles.map((file) => URL.createObjectURL(file));
    onChange('images', [...data.images, ...newImages]);
  };

  const removeImage = (index: number) => {
    const newImages = data.images.filter((_, i) => i !== index);
    onChange('images', newImages);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Fotos do Negócio</h2>
        <p className="text-muted-foreground mt-2">
          Imagens de qualidade aumentam em 3x as chances de venda
        </p>
      </div>

      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer',
          isDragging
            ? 'border-gold bg-gold/10'
            : 'border-muted-foreground/25 hover:border-gold/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
        <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-foreground">
          Arraste e solte suas fotos aqui
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          ou clique para selecionar arquivos
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          Formatos aceitos: JPG, PNG, WEBP • Máximo 10 fotos • Até 5MB cada
        </p>
      </div>

      {data.images.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">
            {data.images.length} foto(s) selecionada(s)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {data.images.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden group"
              >
                <img
                  src={image}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 px-2 py-1 bg-gold text-white text-xs font-medium rounded">
                    Capa
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.images.length === 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ImageIcon className="w-5 h-5 text-gold mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Dicas para fotos melhores:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Fotografe a fachada e entrada do estabelecimento</li>
                <li>• Mostre o ambiente interno bem iluminado</li>
                <li>• Inclua equipamentos e infraestrutura</li>
                <li>• Evite fotos com pessoas identificáveis</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepMedia;
