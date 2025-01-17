class CoverageManager {
	constructor() {
		this.container = document.querySelector('.latest-coverage');
		this.coverageData = [];
		this.proxyUrl = 'https://sbr.cryptoking.workers.dev';
		this.isLoading = true;
	}

	showLoading() {
		if (!this.container) return;
		
		this.container.innerHTML = `
			<div class="loading-header">
				<h3>Latest Coverage</h3>
				<div class="loading-spinner"></div>
			</div>
			${this.getLoadingSkeletons()}
		`;
	}

	getLoadingSkeletons(count = 3) {
		return Array(count).fill(0).map(() => `
			<div class="coverage-loading">
				<div class="skeleton-header">
					<div class="skeleton-icon coverage-skeleton"></div>
					<div class="skeleton-date coverage-skeleton"></div>
				</div>
				<div class="skeleton-text coverage-skeleton"></div>
				<div class="skeleton-text coverage-skeleton"></div>
				<div class="skeleton-text coverage-skeleton"></div>
			</div>
		`).join('');
	}

	async loadCoverage() {
		try {
			this.isLoading = true;
			this.showLoading();

			// Load URLs from file
			const response = await fetch('/data/coverage-urls.txt');
			const text = await response.text();
			const urls = text.split('\n').filter(url => url.trim());

			// Process each URL in parallel
			const coveragePromises = urls.map(url => this.processUrl(url));
			this.coverageData = await Promise.all(coveragePromises);

			// Sort by date and render
			this.coverageData.sort((a, b) => new Date(b.date) - new Date(a.date));
			
			this.isLoading = false;
			this.renderCoverage();
		} catch (error) {
			console.error('Error loading coverage:', error);
			this.isLoading = false;
			this.renderError();
		}
	}

	renderError() {
		if (!this.container) return;

		this.container.innerHTML = `
			<h3>Latest Coverage</h3>
			<div class="coverage-item error">
				<p>Unable to load latest coverage.</p>
				<button onclick="window.coverage.loadCoverage()" class="retry-btn">
					<i class="fas fa-sync-alt"></i> Retry
				</button>
			</div>
		`;
	}

	async processUrl(url) {
		if (url.includes('twitter.com') || url.includes('x.com')) {
			return await this.processTweet(url);
		} else {
			return await this.processArticle(url);
		}
	}

	async processTweet(url) {
		try {
			// Use proxy for Twitter oEmbed request
			const oembedUrl = `${this.proxyUrl}?url=${encodeURIComponent(
				`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`
			)}`;
			
			console.log('Fetching tweet data from:', oembedUrl);
			const response = await fetch(oembedUrl);
			const data = await response.json();

			// Extract tweet ID
			const tweetId = url.split('/').pop().split('?')[0];
			
			console.log('Tweet ID:', tweetId);
			
			// Use proxy for tweet metadata
			const dateResponse = await fetch(`${this.proxyUrl}?url=${encodeURIComponent(
				`https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}`
			)}`);
			const tweetData = await dateResponse.json();
			
			console.log('Tweet metadata:', tweetData);

			// Parse the date - handle different possible date formats
			let tweetDate;
			if (tweetData.created_at) {
				// Try direct ISO format first
				tweetDate = new Date(tweetData.created_at);
				if (isNaN(tweetDate.getTime())) {
					// If that fails, try parsing Twitter's format
					const parts = tweetData.created_at.split(' ');
					tweetDate = new Date(parts.join('T'));
				}
			} else {
				// Fallback to current date if no valid date found
				tweetDate = new Date();
			}

			console.log('Parsed tweet date:', tweetDate);

			return {
				type: 'tweet',
				title: '',
				description: data.html.replace(/<[^>]+>/g, ''), // Strip HTML
				url: url,
				date: tweetDate,
				author: data.author_name,
				accountUrl: `https://x.com/${data.author_name}`
			};
		} catch (error) {
			console.error('Error processing tweet:', error);
			console.error('Error details:', error.message);
			return null;
		}
	}

	async processArticle(url) {
		try {
			// Use a link preview API (example using LinkPreview.net - you'll need an API key)
			// Alternatively, you could use a serverless function to scrape meta tags
			const apiKey = 'f90fa207783843ff6bc8273868c5447e';
			const response = await fetch(`https://api.linkpreview.net/?key=${apiKey}&q=${encodeURIComponent(url)}`);
			const data = await response.json();

			const domain = new URL(url).hostname
				.replace('www.', '')			 // Remove www.
				.split('.')[0]						 // Get first part of domain
				.replace(/-/g, ' ')				 // Replace hyphens with spaces
				.split(' ')								 // Split into words
				.map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
				.join(' ');								 // Join back together

			return {
				type: 'article',
				title: data.title,
				description: data.description,
				url: url,
				date: new Date(), // Note: Most preview APIs don't provide publish date
				author: new URL(url).hostname.replace('www.', ''),
				accountUrl: `http://${new URL(url).hostname}`
			};
		} catch (error) {
			console.error('Error processing article:', error);
			return null;
		}
	}

	// Alternative method using meta tags if you have server-side capability
	async processArticleMetaTags(url) {
		try {
			// This would need to be handled by a server-side proxy due to CORS
			const response = await fetch(`/api/fetch-meta?url=${encodeURIComponent(url)}`);
			const html = await response.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');

			return {
				type: 'article',
				title: doc.querySelector('meta[property="og:title"]')?.content ||
							 doc.querySelector('title')?.textContent,
				description: doc.querySelector('meta[property="og:description"]')?.content ||
										doc.querySelector('meta[name="description"]')?.content,
				url: url,
				date: new Date(doc.querySelector('meta[property="article:published_time"]')?.content) || new Date(),
				author: new URL(url).hostname.replace('www.', ''),
				accountUrl: `http://${new URL(url).hostname}`
			};
		} catch (error) {
			console.error('Error processing article meta tags:', error);
			return null;
		}
	}

	formatDate(date) {
		if (!date || isNaN(date.getTime())) {
			console.error('Invalid date:', date);
			return 'Recently';
		}

		try {
			const now = new Date();
			const diffTime = Math.abs(now - date);
			const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
			
			if (diffDays === 0) {
				const hours = Math.floor(diffTime / (1000 * 60 * 60));
				if (hours === 0) {
					const minutes = Math.floor(diffTime / (1000 * 60));
					return `${minutes}m ago`;
				}
				return `${hours}h ago`;
			} else if (diffDays === 1) {
				return 'Yesterday';
			} else if (diffDays < 7) {
				return `${diffDays}d ago`;
			} else {
				return date.toLocaleDateString('en-US', { 
					month: 'short', 
					day: 'numeric' 
				});
			}
		} catch (error) {
			console.error('Error formatting date:', error);
			return 'Recently';
		}
	}

 renderCoverageItem(item) {
		if (!item) return '';

		const icon = item.type === 'tweet' ? 
			'<i class="fab fa-x-twitter text-white"></i>' : 
			'<i class="far fa-newspaper"></i>';

		return `
			<div class="coverage-item">
				<h4>${item.title}</h4>
				<p>${item.description}</p>
				<div class="coverage-footer">
					<div class="coverage-source-wrapper">
						${icon} <span class="coverage-source">${item.author || ''}</span>
					</div>
					<a href="${item.url}" target="_blank" rel="noopener noreferrer">
						Read More →
					</a>
				</div>
			</div>
		`;
	}

	renderCoverage() {
		if (!this.container) return;

		if (this.isLoading) {
			this.showLoading();
			return;
		}

		const content = this.coverageData
			.filter(item => item)
			.map(item => this.renderCoverageItem(item))
			.join('');

		this.container.innerHTML = `
			<h3>Latest Coverage</h3>
			${content || '<div class="coverage-item"><p>No coverage available.</p></div>'}
		`;
	}
}

// Initialize coverage
document.addEventListener('DOMContentLoaded', () => {
	window.coverage = new CoverageManager();
	window.coverage.loadCoverage();
});
