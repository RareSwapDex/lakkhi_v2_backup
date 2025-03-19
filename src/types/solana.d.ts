/**
 * TypeScript declarations for Solana libraries
 */

// Fill in missing TypeScript declarations for Solana Web3.js
declare module '@solana/web3.js' {
  // Add any missing types here if needed
}

// Fix for @solana/spl-token-metadata types
declare module '@solana/spl-token-metadata' {
  // Add any missing types here if needed
}

// Fix for @solana/codecs-data-structures
declare module '@solana/codecs-data-structures' {
  export namespace DiscriminatedUnion {
    export type Variants<T> = Record<string, T>;
    export type GetEncoderTypeFromVariants<T, D extends string> = any;
    export type DiscriminatedUnionCodecConfig<D extends string, N> = {
      discriminatorProperty?: D;
      discriminatorCodec?: N;
    };
    export interface Encoder<T> {
      encode(value: T): Uint8Array;
    }
    export interface NumberEncoder {
      encode(value: number): Uint8Array;
    }
  }
  
  export function getDiscriminatedUnionEncoder<
    TVariants extends DiscriminatedUnion.Variants<DiscriminatedUnion.Encoder<any>>,
    TDiscriminatorProperty extends string
  >(
    variants: TVariants,
    config?: DiscriminatedUnion.DiscriminatedUnionCodecConfig<TDiscriminatorProperty, DiscriminatedUnion.NumberEncoder>
  ): DiscriminatedUnion.Encoder<DiscriminatedUnion.GetEncoderTypeFromVariants<TVariants, TDiscriminatorProperty>>;
  
  export function getDiscriminatedUnionDecoder<
    TVariants extends DiscriminatedUnion.Variants<any>,
    TDiscriminatorProperty extends string
  >(
    variants: TVariants,
    config?: DiscriminatedUnion.DiscriminatedUnionCodecConfig<TDiscriminatorProperty, DiscriminatedUnion.NumberEncoder>
  ): any;
} 