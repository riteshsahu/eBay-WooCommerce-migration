import uniqueHash from "unique-hash";
import { JSDOM } from "jsdom";

export function ebayToWc(ebayProduct = {}) {
  const requiredPropsFromEbayProduct = {
    Title: true,
    ItemID: true,
    Quantity: true,
  };

  try {
    if (ebayProduct.Currency !== "AUD") {
      throw new Error("Currency is in different format than AUD");
    }

    const price = ebayProduct.SellingStatus?.CurrentPrice?.$t || ebayProduct.StartPrice?.$t;

    if (!price) {
      throw new Error("Price doesn't exists in the input product");
    }

    Object.keys(requiredPropsFromEbayProduct).map((key) => {
      if (!ebayProduct[key]) {
        throw new Error(`${key} doesn't exist in the input product`);
      }
    });

    const stockQuantity = +ebayProduct.Quantity - +ebayProduct.SellingStatus.QuantitySold;

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

    let weight;
    if (ebayProduct.ShippingPackageDetails && ebayProduct.ShippingPackageDetails.WeightMajor?.$t) {
      weight = ebayProduct.ShippingPackageDetails.WeightMajor.$t;
    }

    const allImagesUrls = [];

    let images = ebayProduct.PictureDetails?.PictureURL?.map((url) => {
      if (!allImagesUrls.includes(url)) {
        allImagesUrls.push(url);
        const imgHash = uniqueHash(url, { format: "string" });
        return {
          src: url,
          name: imgHash,
        };
      }
    });

    ebayProduct.Variations?.Pictures?.VariationSpecificPictureSet?.map((pictureSet) => {
      pictureSet?.PictureURL?.map((url) => {
        if (!allImagesUrls.includes(url)) {
          allImagesUrls.push(url);
          const imgHash = uniqueHash(url, { format: "string" });
          images.push({ src: url, name: imgHash });
          return {
            src: url,
            name: imgHash,
          };
        }
      });
    });

    return {
      name: ebayProduct.Title || "",
      type: ebayProduct.Variations?.Variation?.[0] ? "variable" : "simple",
      description: parseEbayDescription(ebayProduct.Description) || "",
      sku: ebayProduct.ItemID,
      regular_price: ebayProduct.DiscountPriceInfo?.OriginalRetailPrice?.$t || price,
      sale_price: price,
      stock_quantity: stockQuantity,
      stock_status: stockQuantity > 0 ? "instock" : "outofstock",
      dimensions,
      weight,
      manage_stock: true,
      meta_data: [
        {
          key: "ebay_ItemID",
          value: ebayProduct.ItemID,
        },
      ],
      images,

      categories: ebayProduct.categories,
      attributes: ebayProduct.attributes,
    };
  } catch (error) {
    throw error;
  }
}

export function ebayProductVariantToWcProductVariant(
  ebayProductVariant = {},
  wooCommerceProduct = {},
  ebayProduct = {}
) {
  const requiredFields = {
    StartPrice: true,
    VariationSpecifics: true,
    Quantity: true,
    SellingStatus: true,
  };
  try {
    Object.keys(requiredFields).map((key) => {
      if (!ebayProductVariant[key]) {
        throw new Error(`${key} doesn't exist in the input data`);
      }
    });

    const stockQuantity = +ebayProductVariant.Quantity - +ebayProductVariant.SellingStatus.QuantitySold;

    let dimensions;
    if (
      ebayProductVariant.ShippingPackageDetails &&
      (ebayProductVariant.ShippingPackageDetails.PackageDepth ||
        ebayProductVariant.ShippingPackageDetails.PackageLength ||
        ebayProductVariant.ShippingPackageDetails.PackageWidth)
    ) {
      dimensions = {
        length: ebayProductVariant.ShippingPackageDetails.PackageLength,
        width: ebayProductVariant.ShippingPackageDetails.PackageWidth,
        height: ebayProductVariant.ShippingPackageDetails.PackageDepth,
      };
    }

    let weight;
    if (ebayProductVariant.ShippingPackageDetails && ebayProductVariant.ShippingPackageDetails.WeightMajor?.$t) {
      weight = ebayProductVariant.ShippingPackageDetails.WeightMajor.$t;
    }

    // console.log(wooCommerceProduct.images, "wooCommerceProduct.images");

    const targetPictureSet = ebayProduct.Variations?.Pictures?.VariationSpecificPictureSet?.find((dt) => {
      const targetAtt = ebayProductVariant.VariationSpecifics.NameValueList.find(
        (at) => at.Name === ebayProduct.Variations?.Pictures?.VariationSpecificName
      );
      if (dt.VariationSpecificValue === targetAtt.Value) {
        return true;
      }
      return false;
    });

    let image;

    if (targetPictureSet?.PictureURL?.[0]) {
      image = wooCommerceProduct.images?.find?.(
        (dt) => dt.name === uniqueHash(targetPictureSet.PictureURL[0], { format: "string" })
      );
    }

    console.log(image, "variant image");

    let attributes = [];

    if (ebayProductVariant.VariationSpecifics?.NameValueList) {
      if (
        !Array.isArray(ebayProductVariant.VariationSpecifics.NameValueList) &&
        ebayProductVariant.VariationSpecifics.NameValueList.Name
      ) {
        ebayProductVariant.VariationSpecifics.NameValueList = [ebayProductVariant.VariationSpecifics.NameValueList];
      }

      if (ebayProductVariant.VariationSpecifics.NameValueList.length) {
        attributes = ebayProductVariant.VariationSpecifics?.NameValueList?.map((dt) => ({
          id: ebayProduct.attributes.find((v) => v.name === dt.Name)?.id,
          option: dt.Value,
        }));
      }
    }

    return {
      regular_price: +ebayProductVariant.StartPrice?.$t,
      sale_price: +ebayProductVariant.StartPrice?.$t,
      ...(image
        ? {
            image: {
              id: image.id,
            },
          }
        : null),
      attributes,
      manage_stock: true,
      stock_quantity: stockQuantity,
      stock_status: stockQuantity > 0 ? "instock" : "outofstock",
      dimensions,
      weight,
      ...(ebayProductVariant.SKU
        ? {
            meta_data: [
              {
                key: "ebay_SKU",
                value: ebayProductVariant.SKU,
              },
            ],
          }
        : null),
    };
  } catch (error) {
    throw error;
  }
}

const parseEbayDescription = (description = "") => {
  const dom = new JSDOM(description);

  const titleElements = dom.window.document.querySelectorAll(
    `div[data-cl-template-tag="description"][data-element-type="editor.elements.TitleElement"]`
  );

  if (titleElements.length) {
    return titleElements?.[0].innerHTML;
  }
  return "";
};
