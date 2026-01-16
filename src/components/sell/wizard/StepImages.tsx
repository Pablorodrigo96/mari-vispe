import ImageUpload from './ImageUpload';

interface StepImagesProps {
  images: string[];
  onChange: (images: string[]) => void;
}

const StepImages = ({ images, onChange }: StepImagesProps) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Fotos do Negócio
        </h2>
        <p className="text-muted-foreground mt-2">
          Adicione fotos para tornar seu anúncio mais atrativo
        </p>
      </div>

      <ImageUpload images={images} onChange={onChange} maxImages={10} />

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