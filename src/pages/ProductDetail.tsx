import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { Loader2, ShoppingCart, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const ProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    const loadProduct = async () => {
      if (!handle) return;
      
      try {
        setLoading(true);
        const products = await fetchProducts(100);
        const foundProduct = products.find(p => p.node.handle === handle);
        
        if (foundProduct) {
          setProduct(foundProduct);
          setSelectedVariant(foundProduct.node.variants.edges[0]?.node);
        }
      } catch (error) {
        console.error('Error loading product:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [handle]);

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    
    const cartItem = {
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Added to cart", {
      description: `${product.node.title} has been added to your cart.`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Product not found.</p>
        </div>
      </div>
    );
  }

  const { node } = product;
  const firstImage = node.images.edges[0]?.node;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Link to="/shop" className="inline-flex items-center text-primary hover:underline mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shop
          </Link>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-secondary/20 rounded-lg overflow-hidden">
              {firstImage ? (
                <img 
                  src={firstImage.url} 
                  alt={firstImage.altText || node.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-4">{node.title}</h1>
                <div className="flex items-center gap-4 mb-4">
                  <Badge variant="outline" className="text-2xl px-4 py-2">
                    {selectedVariant.price.currencyCode} {parseFloat(selectedVariant.price.amount).toFixed(2)}
                  </Badge>
                  {selectedVariant.availableForSale ? (
                    <Badge variant="secondary">In Stock</Badge>
                  ) : (
                    <Badge variant="destructive">Out of Stock</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-lg">{node.description}</p>
              </div>

              {node.variants.edges.length > 1 && (
                <div>
                  <h3 className="font-semibold mb-2">Select Variant:</h3>
                  <div className="flex flex-wrap gap-2">
                    {node.variants.edges.map(({ node: variant }) => (
                      <Button
                        key={variant.id}
                        variant={selectedVariant.id === variant.id ? "default" : "outline"}
                        onClick={() => setSelectedVariant(variant)}
                      >
                        {variant.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleAddToCart}
                size="lg"
                className="w-full"
                disabled={!selectedVariant?.availableForSale}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {selectedVariant?.availableForSale ? 'Add to Cart' : 'Out of Stock'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;
