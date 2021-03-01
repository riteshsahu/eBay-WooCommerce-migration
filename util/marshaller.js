const requiredPropsFromEbayProduct = {
  Title,
  ItemID,
};

export function ebayToWc(ebayProduct = {}) {
  try {
    if (ebayProduct.Currency !== "AUD") {
      throw new Error("Currency is in different format than AUD");
    }
    const price =
      ebayProduct.SellingStatus?.CurrentPrice?.currencyID?.$t ||
      ebayProduct.StartPrice?.$t;

    if (!price) {
      throw new Error("Price doesn't exists in the input product");
    }

    Object.keys(requiredPropsFromEbayProduct).map((key) => {
      if (!ebayProduct[key]) {
        throw new Error(`${key} doesn't exist in the input product`);
      }
    });

    return {
      id: ebayProduct.id,
      name: ebayProduct.Title || "",
      slug: ebayProduct.slug,
      permalink: ebayProduct.permalink,
      date_created: ebayProduct.date_created,
      date_created_gmt: ebayProduct.date_created_gmt,
      date_modified: ebayProduct.date_modified,
      date_modified_gmt: ebayProduct.date_modified_gmt,
      type: ebayProduct.type,
      status: ebayProduct.status,
      featured: ebayProduct.featured,
      catalog_visibility: ebayProduct.catalog_visibility,
      description: ebayProduct.Description || "",
      short_description: ebayProduct.short_description,
      sku: ebayProduct.ItemID,
      price: ebayProduct.price,
      regular_price: ebayProduct.regular_price,
      sale_price: ebayProduct.sale_price,
      date_on_sale_from: ebayProduct.date_on_sale_from,
      date_on_sale_from_gmt: ebayProduct.date_on_sale_from_gmt,
      date_on_sale_to: ebayProduct.date_on_sale_to,
      date_on_sale_to_gmt: ebayProduct.date_on_sale_to_gmt,
      price_html: ebayProduct.price_html,
      on_sale: ebayProduct.on_sale,
      purchasable: ebayProduct.purchasable,
      total_sales: ebayProduct.total_sales,
      virtual: ebayProduct.virtual,
      downloadable: ebayProduct.downloadable,
      downloads: ebayProduct.downloads,
      download_limit: ebayProduct.download_limit,
      download_expiry: ebayProduct.download_expiry,
      external_url: ebayProduct.external_url,
      button_text: ebayProduct.button_text,
      tax_status: ebayProduct.tax_status,
      tax_class: ebayProduct.tax_class,
      manage_stock: ebayProduct.manage_stock,
      stock_quantity: ebayProduct.stock_quantity,
      stock_status: ebayProduct.stock_status,
      backorders: ebayProduct.backorders,
      backorders_allowed: ebayProduct.backorders_allowed,
      backordered: ebayProduct.backordered,
      sold_individually: ebayProduct.sold_individually,
      weight: ebayProduct.weight,
      dimensions: ebayProduct.dimensions,
      shipping_required: ebayProduct.shipping_required,
      shipping_taxable: ebayProduct.shipping_taxable,
      shipping_class: ebayProduct.shipping_class,
      shipping_class_id: ebayProduct.shipping_class_id,
      reviews_allowed: ebayProduct.reviews_allowed,
      average_rating: ebayProduct.average_rating,
      rating_count: ebayProduct.rating_count,
      related_ids: ebayProduct.related_ids,
      upsell_ids: ebayProduct.upsell_ids,
      cross_sell_ids: ebayProduct.cross_sell_ids,
      parent_id: ebayProduct.parent_id,
      purchase_note: ebayProduct.purchase_note,
      categories: ebayProduct.categories,
      tags: ebayProduct.tags,
      images: ebayProduct.images,
      attributes: ebayProduct.attributes,
      default_attributes: ebayProduct.default_attributes,
      variations: ebayProduct.variations,
      grouped_products: ebayProduct.grouped_products,
      menu_order: ebayProduct.menu_order,
      meta_data: ebayProduct.meta_data,
    };
  } catch (error) {
    throw error;
  }
}
