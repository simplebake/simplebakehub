import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface ProductCardProps {
  product: ShopifyProduct;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore(state => state.addItem);
  const { node } = product;
  
  const firstVariant = node.variants.edges[0]?.node;
  const firstImage = node.images.edges[0]?.node;
  
  const handleAddToCart = () => {
    if (!firstVariant) return;
    
    const cartItem = {
      product,
      variantId: firstVariant.id,
      variantTitle: firstVariant.title,
      price: firstVariant.price,
      quantity: 1,
      selectedOptions: firstVariant.selectedOptions || []
    };
    
    addItem(cartItem);
    toast.success("Added to cart", {
      description: `${node.title} has been added to your cart.`,
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/product/${node.handle}`}>
        <div className="aspect-square bg-secondary/20 overflow-hidden">
          {firstImage ? (
            <img 
              src={firstImage.url} 
              alt={firstImage.altText || node.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
      </Link>
      
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{node.title}</CardTitle>
          <Badge variant="secondary" className="flex-shrink-0">
            {node.priceRange.minVariantPrice.currencyCode} {parseFloat(node.priceRange.minVariantPrice.amount).toFixed(2)}
          </Badge>
        </div>
        {node.description && (
          <CardDescription className="line-clamp-2">{node.description}</CardDescription>
        )}
      </CardHeader>
      
      <CardFooter>
        <Button 
          onClick={handleAddToCart}
          className="w-full"
          disabled={!firstVariant?.availableForSale}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {firstVariant?.availableForSale ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </CardFooter>
    </Card>
  );
};
