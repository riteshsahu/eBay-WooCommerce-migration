const requiredPropsFromEbayProduct = {
  Title: true,
  ItemID: true,
  Quantity: true,
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

    const stockQuantity =
      +ebayProduct.Quantity - +ebayProduct.SellingStatus.QuantitySold;

    let dimensions;
    if (
      ebayProduct.ShippingPackageDetails &&
      (ebayProduct.ShippingPackageDetails.PackageDepth ||
        ebayProduct.ShippingPackageDetails.PackageLength ||
        ebayProduct.ShippingPackageDetails.PackageWidth)
    ) {
      dimensions = {
        length: ebayProduct.ShippingPackageDetails.PackageLength,
        width: ebayProduct.ShippingPackageDetails.PackageWidth,
        height: ebayProduct.ShippingPackageDetails.PackageDepth,
      };
    }

    let images = ebayProduct.PictureDetails?.PictureURL?.map((url) => ({
      src: url,
    }));

    ebayProduct.Variations?.Pictures?.VariationSpecificPictureSet?.map(
      (pictureSet) => {
        pictureSet?.PictureURL?.map((url, idx) => {
          images.push({ src: url, name: url });
        });
      }
    );

    return {
      name: ebayProduct.Title || "",
      type: ebayProduct.Variations?.Variation?.[0] ? "variable" : "simple",
      description: ebayProduct.Description || "",
      sku: ebayProduct.ItemID,
      regular_price:
        ebayProduct.DiscountPriceInfo?.OriginalRetailPrice?.$t || price,
      sale_price: price,
      stock_quantity: stockQuantity,
      stock_status: stockQuantity > 0 ? "instock" : "outofstock",
      dimensions,
      meta_data: [
        {
          key: "ebay_ItemID",
          value: ebayProduct.ItemID,
        },
      ],
      images,

      categories: ebayProduct.categories?.map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
      })),
      attributes: ebayProduct.attributes,
      variations: ebayProduct.variations,
    };
  } catch (error) {
    throw error;
  }
}
