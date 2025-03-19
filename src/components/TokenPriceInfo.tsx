import { useState, useEffect } from 'react';
import axios from 'axios';
import { LAKKHI_TOKEN_MINT } from '@/utils/anchor-client';
import styles from '@/styles/TokenPriceInfo.module.css';

interface TokenPriceData {
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: string;
}

const TokenPriceInfo = () => {
  const [priceData, setPriceData] = useState<TokenPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokenPrice = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use CoinGecko API to fetch New Born Rhino token data
        const response = await axios.get(
          'https://api.coingecko.com/api/v3/coins/new-born-rhino',
          {
            params: {
              localization: false,
              tickers: false,
              community_data: false,
              developer_data: false,
            },
          }
        );

        const data = response.data;
        
        setPriceData({
          price: data.market_data.current_price.usd,
          priceChange24h: data.market_data.price_change_percentage_24h,
          marketCap: data.market_data.market_cap.usd,
          volume24h: data.market_data.total_volume.usd,
          lastUpdated: data.last_updated,
        });
      } catch (err) {
        console.error('Error fetching token price:', err);
        setError('Failed to load price data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTokenPrice();
    
    // Refresh price data every 5 minutes
    const interval = setInterval(fetchTokenPrice, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value < 0.01 ? 8 : 2,
      maximumFractionDigits: value < 0.01 ? 8 : 2,
    }).format(value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>LAKKHI Token</h3>
        <span className={styles.badge}>Live</span>
      </div>
      
      <p className={styles.tokenAddress}>
        {LAKKHI_TOKEN_MINT.toString()}
      </p>
      
      <div className={styles.divider} />
      
      {loading ? (
        <p>Loading token price information...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : priceData ? (
        <div>
          <div className={styles.row}>
            <span className={styles.label}>Price:</span>
            <span className={styles.value}>{formatCurrency(priceData.price)}</span>
          </div>
          
          <div className={styles.row}>
            <span className={styles.label}>24h Change:</span>
            <span 
              className={`${styles.value} ${priceData.priceChange24h >= 0 ? styles.positive : styles.negative}`}
            >
              {priceData.priceChange24h >= 0 ? '+' : ''}
              {priceData.priceChange24h.toFixed(2)}%
            </span>
          </div>
          
          <div className={styles.row}>
            <span className={styles.label}>Market Cap:</span>
            <span>{formatCurrency(priceData.marketCap)}</span>
          </div>
          
          <div className={styles.row}>
            <span className={styles.label}>24h Volume:</span>
            <span>{formatCurrency(priceData.volume24h)}</span>
          </div>
          
          <div className={styles.divider} />
          
          <div className={styles.footer}>
            <span className={styles.lastUpdated}>
              Last updated: {new Date(priceData.lastUpdated).toLocaleString()}
            </span>
            <a 
              href="https://www.coingecko.com/en/coins/new-born-rhino"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.viewLink}
            >
              <span>View on CoinGecko</span>
              <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      ) : (
        <p>No price data available</p>
      )}
    </div>
  );
};

export default TokenPriceInfo; 