import { MoneyPriceConfig, PaymentProviderConfig, EnhancePricePlan } from '@windrun-huaiin/third-ui/main/server'

export const moneyPriceConfig: MoneyPriceConfig = {
  paymentProviders: {
    stripe: {
      provider: 'stripe',
      enabled: true,
      products: {
        free: {
          key: 'free',
          name: 'free', // 仅作为标识符
          plans: {
            monthly: {
              priceId: 'free',
              amount: 0,
              currency: 'usd',
              credits: 0
            },
            yearly: {
              priceId: 'free',
              amount: 0,
              currency: 'usd',
              credits: 0
            }
          }
        },
        pro: {
          key: 'pro',
          name: 'pro', // 仅作为标识符
          plans: {
            monthly: {
              priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
              amount: Number(process.env.STRIPE_PRO_MONTHLY_AMOUNT!), // 10
              currency: process.env.STRIPE_PRO_MONTHLY_CURRENCY!,
              credits: Number(process.env.STRIPE_PRO_MONTHLY_CREDITS!) // 100
            },
            yearly: {
              priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
              amount: Number(process.env.STRIPE_PRO_YEARLY_AMOUNT!), // 8
              originalAmount: 10, // 10*12
              discountPercent: 20,
              currency: process.env.STRIPE_PRO_YEARLY_CURRENCY!,
              credits: Number(process.env.STRIPE_PRO_YEARLY_CREDITS!) // 1200
            }
          }
        },
        ultra: {
          key: 'ultra',
          name: 'ultra', // 仅作为标识符
          plans: {
            monthly: {
              priceId: process.env.STRIPE_ULTRA_MONTHLY_PRICE_ID!,
              amount: Number(process.env.STRIPE_ULTRA_MONTHLY_AMOUNT!), // 20
              currency: process.env.STRIPE_ULTRA_MONTHLY_CURRENCY!,
              credits: Number(process.env.STRIPE_ULTRA_MONTHLY_CREDITS!) // 250
            },
            yearly: {
              priceId: process.env.STRIPE_ULTRA_YEARLY_PRICE_ID!,
              amount: Number(process.env.STRIPE_ULTRA_YEARLY_AMOUNT!), // 16
              originalAmount: 20, // 20*12
              discountPercent: 20,
              currency: process.env.STRIPE_ULTRA_YEARLY_CURRENCY!,
              credits: Number(process.env.STRIPE_ULTRA_YEARLY_CREDITS!) // 3000
            }
          }
        }
      }
    },
    paypal: {
      provider: 'paypal',
      // 暂未启用
      enabled: false,
      products: {
        free: {
          key: 'free',
          name: 'free', // 仅作为标识符
          plans: {
            monthly: {
              priceId: 'free',
              amount: 0,
              currency: 'usd',
              credits: 0
            },
            yearly: {
              priceId: 'free',
              amount: 0,
              currency: 'usd',
              credits: 0
            }
          }
        },
        pro: {
          key: 'pro',
          name: 'pro', // 仅作为标识符
          plans: {
            monthly: {
              priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
              amount: Number(process.env.STRIPE_PRO_MONTHLY_AMOUNT!), // 10
              currency: process.env.STRIPE_PRO_MONTHLY_CURRENCY!,
              credits: Number(process.env.STRIPE_PRO_MONTHLY_CREDITS!) // 100
            },
            yearly: {
              priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
              amount: Number(process.env.STRIPE_PRO_YEARLY_AMOUNT!), // 8
              originalAmount: 10, // 10*12
              discountPercent: 20,
              currency: process.env.STRIPE_PRO_YEARLY_CURRENCY!,
              credits: Number(process.env.STRIPE_PRO_YEARLY_CREDITS!) // 1200
            }
          }
        },
        ultra: {
          key: 'ultra',
          name: 'ultra', // 仅作为标识符
          plans: {
            monthly: {
              priceId: process.env.STRIPE_ULTRA_MONTHLY_PRICE_ID!,
              amount: Number(process.env.STRIPE_ULTRA_MONTHLY_AMOUNT!), // 20
              currency: process.env.STRIPE_ULTRA_MONTHLY_CURRENCY!,
              credits: Number(process.env.STRIPE_ULTRA_MONTHLY_CREDITS!) // 250
            },
            yearly: {
              priceId: process.env.STRIPE_ULTRA_YEARLY_PRICE_ID!,
              amount: Number(process.env.STRIPE_ULTRA_YEARLY_AMOUNT!), // 16
              originalAmount: 20, // 20*12
              discountPercent: 20,
              currency: process.env.STRIPE_ULTRA_YEARLY_CURRENCY!,
              credits: Number(process.env.STRIPE_ULTRA_YEARLY_CREDITS!) // 3000
            }
          }
        }
      }
    },
  },
  
  activeProvider: process.env.ACTIVE_PAYMENT_PROVIDER || 'stripe',
  
  display: {
    currency: '$',
    locale: 'en',
    minFeaturesCount: 4
  }
};

// 辅助函数：获取当前激活的支付供应商配置
export function getActiveProviderConfig(): PaymentProviderConfig {
  const provider = moneyPriceConfig.activeProvider;
  return moneyPriceConfig.paymentProviders[provider];
}

// 辅助函数：获取特定产品的价格信息
export function getProductPricing(
  productKey: 'free' | 'pro' | 'ultra',
  billingType: 'monthly' | 'yearly',
  provider?: string
): EnhancePricePlan {
  const targetProvider = provider || moneyPriceConfig.activeProvider;
  const providerConfig = moneyPriceConfig.paymentProviders[targetProvider];
  return providerConfig.products[productKey].plans[billingType];
}

