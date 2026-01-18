export const extractItemPrompt = (url: string) => `
You are extracting structured data for a marketplace item from a product URL.

**IMPORTANT:** Only process product URLs for physical items like shoes, clothing, electronics, furniture, etc.
If the URL is NOT a product (e.g., blog, homepage, service page), return the "unsupported" response below.

URL:
${url}

Return STRICT JSON with this shape:

FOR VALID PRODUCTS:
{
  "supported": true,
  "brand": string | null,
  "product_line": string | null,
  "target_user": string | null,
  "core_type": string | null,
  "key_attributes": {
    "material": string | null,
    "closure": string | null,
    "usage": string | null
  },
  "variant_attributes": {
    "color": string | null,
    "size": string | null
  },
  "title": string | null,
  "description": string | null
}

FOR UNSUPPORTED URLs (non-products):
{
  "supported": false,
  "message": "🎯 We're focusing on physical products right now! Try a product link from Nike, Amazon, Zara, etc."
}

Rules:
- brand: Nike, Adidas, Apple, IKEA, etc.
- product_line: Air Zoom Pegasus 40, iPhone 15 Pro, etc.
- target_user: Men, Women, Kids, Unisex, etc.
- core_type: Running Shoe, Laptop, Sofa, T-Shirt, etc.
- key_attributes: Properties that define the product identity (not variants)
- variant_attributes: Properties that differ between the same product (color, size)
- Use null if unknown
- Do not add extra keys
- Do not include explanations
`;
