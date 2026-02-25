import ImageUpload from './ImageUpload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StepImagesProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  videoUrl?: string;
  onVideoUrlChange?: (url: string) => void;
}

const StepImages = ({ images, onChange, maxImages = 5, videoUrl, onVideoUrlChange }: StepImagesProps) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Fotos e Vídeo do Negócio
        </h2>
        <p className="text-muted-foreground mt-2">
          Adicione fotos e vídeo para tornar seu anúncio mais atrativo
        </p>
      </div>

      <ImageUpload images={images} onChange={onChange} maxImages={maxImages} />

      <p className="text-sm text-muted-foreground text-center">
        Plano Básico permite até 5 fotos. Faça upgrade para o Master para até 20 fotos.
      </p>

      {/* Video URL */}
      {onVideoUrlChange && (
        <div className="space-y-2">
          <Label htmlFor="video-url">🎥 URL do Vídeo (opcional)</Label>
          <Input
            id="video-url"
            placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
            value={videoUrl || ''}
            onChange={(e) => onVideoUrlChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Cole um link do YouTube, Vimeo ou URL direta de vídeo
          </p>
        </div>
      )}

      {/* Tips Box */}
      <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
        <h4 className="font-medium text-foreground mb-2">📸 Dicas para boas fotos</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Fotografe em boa iluminação (preferencialmente luz natural)</li>
          <li>• Mostre a fachada, interior e áreas de destaque</li>
          <li>• Evite fotos com pessoas ou informações confidenciais</li>
          <li>• A primeira foto será a capa do seu anúncio</li>
        </ul>
      </div>
    </div>
  );
};

export default StepImages;