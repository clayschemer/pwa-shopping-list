export type AccountId  = string & { readonly __brand: 'account'  };
export type UserId     = string & { readonly __brand: 'user'      };
export type ShopId     = string & { readonly __brand: 'shop'      };
export type CategoryId = string & { readonly __brand: 'category'  };
export type ItemId     = string & { readonly __brand: 'item'      };
export type SessionId  = string & { readonly __brand: 'session'   };
