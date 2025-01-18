class TokenDataManager {
	constructor() {
		this.lastPrice = 0;
		this.lastMcap = 0;
		this.updateCounter = 30;
		
		// Make the refresh function globally accessible
		window.tokenData = this;
	}

	formatNumber(num, decimals = 2) {
		if (num >= 1000000000) {
			return (num / 1000000000).toFixed(decimals) + 'B';
		} else if (num >= 1000000) {
			return (num / 1000000).toFixed(decimals) + 'M';
		} else if (num >= 1000) {
			return (num / 1000).toFixed(decimals) + 'K';
		}
		return num.toFixed(decimals);
	}

	async getMarketData() {
		console.log('Fetching market data from CoinGecko...');
		try {
			const response = await fetch('https://api.coingecko.com/api/v3/coins/BITCOIN-MINER');
			if (!response.ok) {
				throw new Error('CoinGecko API error: ' + response.status);
			}
			const data = await response.json();
			console.log('CoinGecko response:', data);
			
			return {
				price: data.market_data.current_price.usd,
				marketCap: data.market_data.market_cap.usd,
				priceChange24h: data.market_data.price_change_percentage_24h
			};
		} catch (error) {
			console.error('Error fetching from CoinGecko:', error);
			return null;
		}
	}

	updateElement(elementId, value, lastValue, decimals = 2) {
		const element = document.getElementById(elementId);
		if (!element) return;

		const container = element.closest('.token-live-stat');
		
		// Format value based on type
		let formattedValue;
		if (elementId.includes('Price')) {
			formattedValue = `$${value.toFixed(2)}`;
		} else if (elementId.includes('marketCap')) {
			formattedValue = `$${this.formatNumber(value)}`;
		}

		// Add animation classes
		container.classList.add('updating');
		element.classList.add('spinning');
		
		// Update the value
		element.textContent = formattedValue;

		// Update change percentage
		const changeId = elementId.replace('Price', 'Change')
			.replace('Cap', 'Change');
		const changeElement = document.getElementById(changeId);

		if (changeElement && lastValue) {
			const change = ((value - lastValue) / lastValue) * 100;
			changeElement.classList.add('spinning');
			changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
			changeElement.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
		}

		// Remove animation classes after animation completes
		setTimeout(() => {
			container.classList.remove('updating');
			element.classList.remove('spinning');
			if (changeElement) {
				changeElement.classList.remove('spinning');
			}
		}, 500);
	}


	updateAllStats(marketData) {
		['', 'Mobile'].forEach(suffix => {
			// Update price
			this.updateElement(`tokenPrice${suffix}`, marketData.price, this.lastPrice);
			// Update market cap
			this.updateElement(`marketCap${suffix}`, marketData.marketCap, this.lastMcap);
		});
	}

	async fetchTokenStats() {
		console.log('Manual refresh triggered');
		try {
			// Add refreshing state
			const refreshBtn = document.querySelector('.refresh-btn');
			if (refreshBtn) {
				refreshBtn.classList.add('refreshing');
			}

			const marketData = await this.getMarketData();

			if (marketData) {
				this.updateAllStats(marketData);
				
				// Store current values
				this.lastPrice = marketData.price;
				this.lastMcap = marketData.marketCap;
			}

			// Reset timer
			this.updateCounter = 30;
		} catch (error) {
			console.error('Error in fetchTokenStats:', error);
		} finally {
			// Remove refreshing state after short delay
			setTimeout(() => {
				const refreshBtn = document.querySelector('.refresh-btn');
				if (refreshBtn) {
					refreshBtn.classList.remove('refreshing');
				}
			}, 500);
		}
	}

	updateTimer() {
		const counterElement = document.getElementById('updateCounter');
		const counterElementMobile = document.getElementById('updateCounterMobile');
		if (counterElement) {
			counterElement.textContent = this.updateCounter;
		}
		if (counterElementMobile) {
			counterElementMobile.textContent = this.updateCounter;
		}
		this.updateCounter--;
		if (this.updateCounter < 0) {
			this.updateCounter = 30;
			this.fetchTokenStats();
		}
	}

	// Initialize timer and first data fetch
	init() {
		this.fetchTokenStats();
		setInterval(() => this.updateTimer(), 1000);
	}
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
	const tokenData = new TokenDataManager();
	tokenData.init();
});
