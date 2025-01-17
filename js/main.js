// Navbar scroll effect
$(window).scroll(function() {
	if ($(window).scrollTop() > 50) {
		$('.navbar').addClass('scrolled');
	} else {
		$('.navbar').removeClass('scrolled');
	}
});

// Smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
	anchor.addEventListener('click', function (e) {
		e.preventDefault();
		document.querySelector(this.getAttribute('href')).scrollIntoView({
			behavior: 'smooth'
		});
	});
});

// Copy contract address
function copyContract() {
	navigator.clipboard.writeText('0xd6203889c22d9fe5e938a9200f50fdffe9dd8e02');
	const btn = document.querySelector('.copy-btn');
	btn.innerHTML = '<i class="fas fa-check"></i>';
	
	// Add ripple effect
	const ripple = document.createElement('div');
	ripple.classList.add('ripple');
	btn.appendChild(ripple);
	
	setTimeout(() => {
		btn.innerHTML = '<i class="fas fa-copy"></i>';
		ripple.remove();
	}, 2000);
}

// Scroll animations
const observerOptions = {
	threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
	entries.forEach(entry => {
		if (entry.isIntersecting) {
			entry.target.classList.add('visible');
		}
	});
}, observerOptions);

document.querySelectorAll('.section').forEach(section => {
	section.classList.add('fade-in-up');
	observer.observe(section);
});


function handleSubmit(event) {
		event.preventDefault();
		const form = event.target;
		const submitBtn = document.getElementById('submitBtn');
		const formData = new FormData(form);

		// Debug log
		console.log('Form data:', Object.fromEntries(formData.entries()));

		// Disable submit button and show loading state
		submitBtn.disabled = true;
		submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

		// Convert FormData to a simple object
		const data = {};
		formData.forEach((value, key) => {
				data[key] = value;
		});

		// Debug log
		console.log('Sending data:', data);

		fetch('/v2/lib/sendEmail.php', {
				method: 'POST',
				headers: {
						'Content-Type': 'application/json',
				},
				body: JSON.stringify(data)
		})
		.then(response => {
				// Debug log
				console.log('Raw response:', response);
				return response.json();
		})
		.then(result => {
				console.log('Parsed response:', result);
				if (result.success) {
						showFeedback('Message sent successfully! We\'ll get back to you soon.', 'success');
						form.reset();
				} else {
						throw new Error(result.error || 'Failed to send message');
				}
		})
		.catch(error => {
				console.error('Detailed error:', error);
				showFeedback('Error sending message. Please try again.', 'error');
		})
		.finally(() => {
				// Reset button state
				submitBtn.disabled = false;
				submitBtn.innerHTML = 'Send Message';
		});
}

// Feedback toast handling
function showFeedback(message, type) {
	const feedback = document.getElementById('formFeedback');
	const feedbackMessage = document.getElementById('feedbackMessage');
	
	feedbackMessage.textContent = message;
	feedback.className = `form-feedback ${type}`;
	
	// Show feedback
	setTimeout(() => {
		feedback.classList.add('show');
	}, 100);
	
	// Hide feedback after 5 seconds
	setTimeout(() => {
		feedback.classList.remove('show');
	}, 5000);
}

// Form input animations
document.querySelectorAll('.form-control').forEach(input => {
	input.addEventListener('focus', function() {
		this.closest('.form-group').classList.add('focused');
	});
	
	input.addEventListener('blur', function() {
		if (!this.value) {
			this.closest('.form-group').classList.remove('focused');
		}
	});
});
