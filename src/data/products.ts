import { Product } from "@/lib/schema";

export const towerProducts: Product[] = [
  {
    id: "prod_tower_24cm_pan",
    brand_id: "brand_tower",
    sku: "TWR-24CM-FRY",
    name: "Tower 24cm Non-Stick Frying Pan",
    category: "Frying Pan",
    launch_date: "2023-09-01",
    market: "IN",
    marketplace_ids: ["amazon_in", "flipkart_in", "noon_uae", "noon_ksa"],
    estimated_recent_orders: 4200,
    estimated_gmv: 126000, // ~$30 avg order
  },
  {
    id: "prod_tower_28cm_pan",
    brand_id: "brand_tower",
    sku: "TWR-28CM-FRY",
    name: "Tower 28cm Non-Stick Frying Pan",
    category: "Frying Pan",
    launch_date: "2023-10-15",
    market: "IN",
    marketplace_ids: ["amazon_in", "flipkart_in"],
    estimated_recent_orders: 2100,
    estimated_gmv: 63000,
  },
  {
    id: "prod_tower_saucepan_20cm",
    brand_id: "brand_tower",
    sku: "TWR-20CM-SAU",
    name: "Tower 20cm Saucepan with Lid",
    category: "Saucepan",
    launch_date: "2024-01-10",
    market: "UAE",
    marketplace_ids: ["noon_uae", "noon_ksa"],
    estimated_recent_orders: 1500,
    estimated_gmv: 45000,
  },
];

export function getProductById(id: string) {
  return towerProducts.find((p) => p.id === id);
}

export function getDefaultDemoProduct() {
  return towerProducts[0]; // Tower 24cm pan
}
