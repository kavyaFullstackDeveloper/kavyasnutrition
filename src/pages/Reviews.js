
import React, { useState, useEffect, useCallback } from 'react';
import {
  FaStar,
  FaYoutube
} from 'react-icons/fa';
import './Reviews.css';

import { auth, provider, db, storage } from '../firebase.js';

import {
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';

import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';

import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

import { v4 as uuidv4 } from 'uuid';

/* =========================================================
   YOUTUBE VIDEO TESTIMONIALS
   Keep your existing video IDs.
========================================================= */
const testimonialVideos = [
  { id: '0fyEsfsoQgI', title: 'Client Transformation Story' },
  { id: 'wzlBQvSL5Gs', title: 'Client Wellness Journey' },
  { id: 'd2w5D0PhFFM', title: 'Client Success Story' },
  { id: 'bF2D7n0JCoc', title: 'Client Testimonial' }
];

const Reviews = () => {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    review: '',
    rating: 0,
    isTestimonial: false,
    image: null,
    imagePreview: null
  });

  /* =========================================================
     AUTH STATE
  ========================================================= */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  /* =========================================================
     FETCH EXISTING WRITTEN REVIEWS
     Keeps the existing Firestore collection and data format.
  ========================================================= */
  const fetchReviews = useCallback(async () => {
    setFetching(true);
    setErrorMessage('');

    try {
      const reviewsQuery = query(
        collection(db, 'review'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(reviewsQuery);

      const reviewData = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
      }));

      setReviews(reviewData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setErrorMessage(
        'Unable to load written reviews right now. Please refresh the page.'
      );
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  /* =========================================================
     GOOGLE LOGIN
  ========================================================= */
  const handleLogin = async () => {
    setErrorMessage('');

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google login failed:', error);
      setErrorMessage(
        error.code === 'auth/popup-closed-by-user'
          ? 'Sign-in was cancelled. You can try again.'
          : 'Unable to sign in with Google. Please try again.'
      );
    }
  };

  /* =========================================================
     LOGOUT
  ========================================================= */
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
      setErrorMessage('Unable to sign out. Please try again.');
    }
  };

  /* =========================================================
     FORM CHANGE
  ========================================================= */
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  /* =========================================================
     STAR RATING
  ========================================================= */
  const handleRating = (ratingValue) => {
    setFormData((previous) => ({
      ...previous,
      rating: ratingValue
    }));
  };

  /* =========================================================
     IMAGE UPLOAD
  ========================================================= */
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Please select an image smaller than 5 MB.');
      event.target.value = '';
      return;
    }

    setErrorMessage('');

    setFormData((previous) => {
      if (previous.imagePreview) {
        URL.revokeObjectURL(previous.imagePreview);
      }

      return {
        ...previous,
        image: file,
        imagePreview: URL.createObjectURL(file)
      };
    });
  };

  /* =========================================================
     SUBMIT REVIEW
  ========================================================= */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    const reviewText = formData.review.trim();

    if (!user) {
      setErrorMessage('Please sign in with Google before submitting a review.');
      return;
    }

    if (!reviewText || formData.rating < 1) {
      setErrorMessage('Please write your review and select a star rating.');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = '';

      if (formData.image) {
        const safeFileName = formData.image.name.replace(
          /[^a-zA-Z0-9.\-_]/g,
          '_'
        );

        const imagePath = `review/${uuidv4()}-${safeFileName}`;
        const imageReference = ref(storage, imagePath);

        await uploadBytes(imageReference, formData.image);
        imageUrl = await getDownloadURL(imageReference);
      }

      await addDoc(collection(db, 'review'), {
        name: user.displayName || 'Client',
        email: user.email || '',
        review: reviewText,
        rating: Number(formData.rating),
        imageUrl,
        isTestimonial: Boolean(formData.isTestimonial),
        createdAt: serverTimestamp()
      });

      if (formData.imagePreview) {
        URL.revokeObjectURL(formData.imagePreview);
      }

      setFormData({
        review: '',
        rating: 0,
        isTestimonial: false,
        image: null,
        imagePreview: null
      });

      const fileInput = document.getElementById('review-image-upload');
      if (fileInput) fileInput.value = '';

      alert('Your review was submitted successfully!');

      await fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      setErrorMessage(
        'Your review could not be submitted. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CLEAN UP IMAGE PREVIEW URL
  ========================================================= */
  useEffect(() => {
    return () => {
      if (formData.imagePreview) {
        URL.revokeObjectURL(formData.imagePreview);
      }
    };
  }, [formData.imagePreview]);

  /* =========================================================
     SEPARATE FEATURED TESTIMONIALS AND OTHER REVIEWS
  ========================================================= */
  const testimonials = reviews.filter(
    (review) => review.isTestimonial === true
  );

  const clientReviews = reviews.filter(
    (review) => review.isTestimonial !== true
  );

  /* =========================================================
     REUSABLE STAR DISPLAY
  ========================================================= */
  const renderStars = (rating) => (
    <div className="rating" aria-label={`${rating || 0} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <FaStar
          key={value}
          size={15}
          color={value <= Number(rating || 0) ? '#c89b3c' : '#e1e4e1'}
        />
      ))}
    </div>
  );

  /* =========================================================
     REUSABLE WRITTEN REVIEW CARD
  ========================================================= */
  const renderReviewCard = (review, featured = false) => (
    <article
      key={review.id}
      className={featured ? 'testimonial-card' : 'review-card'}
    >
      <div className="content">
        {review.imageUrl && (
          <img
            src={review.imageUrl}
            alt={`${review.name || 'Client'}'s review`}
            className="client-image"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}

        <div className="review-content">
          <p className="name">{review.name || 'Client'}</p>

          {renderStars(review.rating)}

          <p className="review">
            “{review.review}”
          </p>
        </div>
      </div>
    </article>
  );

  /* =========================================================
     PAGE
  ========================================================= */
  return (
    <div className="reviews-container">

      {/* PAGE HEADER */}
      <header className="reviews-header">
        <span className="reviews-eyebrow">
          REAL STORIES • REAL JOURNEYS
        </span>

        <h1 className="reviews-title">Success Stories</h1>

        <p className="reviews-intro">
          Every health journey is unique. Hear from people who chose to
          make their health a priority.
        </p>
      </header>

      {/* YOUTUBE VIDEO TESTIMONIALS */}
      <section className="video-testimonials">
        <div className="video-section-heading">
          <span className="section-eyebrow">VIDEO TESTIMONIALS</span>
          <h2>Hear It From My Clients</h2>
          <p>
            Real experiences, personal journeys, and stories of change.
          </p>
        </div>

        <div className="testimonial-video-grid">
          {testimonialVideos.map((video) => (
            <article
              className="testimonial-video-card"
              key={video.id}
            >
              <div className="video-wrapper">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                  title={video.title}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              <div className="video-card-content">
                <span className="video-label">
                  <FaYoutube aria-hidden="true" /> CLIENT STORY
                </span>
                <h3>{video.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* LOGIN / LOGOUT */}
      <section className="review-access">
        {!user ? (
          <div className="login-box">
            <div className="login-content">
              <span className="login-icon">💬</span>
              <div>
                <h3>Have you worked with me?</h3>
                <p>
                  Your experience could inspire someone else on their
                  wellness journey.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              className="google-signin"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                aria-hidden="true"
              />
              Sign in with Google to share your story
            </button>
          </div>
        ) : (
          <div className="logged-user">
            <span>
              👋 Welcome, <strong>{user.displayName || user.email}</strong>
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="google-signout"
            >
              Sign Out
            </button>
          </div>
        )}
      </section>

      {/* FORM STATUS MESSAGES */}
      {errorMessage && (
        <p className="review-message" role="alert">
          {errorMessage}
        </p>
      )}

      {/* REVIEW FORM */}
      {user && (
        <section className="review-form-section">
          <div className="form-heading">
            <span className="section-eyebrow">SHARE YOUR EXPERIENCE</span>
            <h2>Tell Us About Your Journey</h2>
          </div>

          <form onSubmit={handleSubmit} className="review-form">
            <textarea
              name="review"
              placeholder="Tell us about your experience..."
              value={formData.review}
              onChange={handleChange}
              rows={5}
              maxLength={3000}
              required
            />

            <div className="rating-input">
              <label>Your Rating</label>

              <div className="star-selector">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="star-button"
                    onClick={() => handleRating(value)}
                    aria-label={`${value} star rating`}
                    aria-pressed={value === formData.rating}
                  >
                    <FaStar
                      size={25}
                      color={
                        value <= formData.rating
                          ? '#c89b3c'
                          : '#d9ddd9'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="image-upload">
              <label htmlFor="review-image-upload">
                Add a photo <span>(optional, max 5 MB)</span>
              </label>

              <input
                id="review-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>

            {formData.imagePreview && (
              <img
                src={formData.imagePreview}
                alt="Selected review photo preview"
                className="image-preview"
              />
            )}

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isTestimonial"
                checked={formData.isTestimonial}
                onChange={handleChange}
              />

              <span>
                I’d like my review to be considered as a featured
                testimonial 🌟
              </span>
            </label>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Share My Experience →'}
            </button>
          </form>
        </section>
      )}

      {/* LOADING STATE */}
      {fetching && (
        <div className="spinner" role="status">
          <span>Loading client stories...</span>
        </div>
      )}

      {/* FEATURED WRITTEN TESTIMONIALS */}
      {!fetching && testimonials.length > 0 && (
        <section className="featured-testimonials">
          <div className="section-heading">
            <span className="section-eyebrow">CLIENT EXPERIENCES</span>
            <h2>Words That Mean the Most</h2>
          </div>

          <div className="testimonial-list">
            {testimonials.map((review) => renderReviewCard(review, true))}
          </div>
        </section>
      )}

      {/* ALL OTHER WRITTEN REVIEWS */}
      {!fetching && clientReviews.length > 0 && (
        <section className="all-reviews">
          <div className="section-heading">
            <span className="section-eyebrow">MORE CLIENT STORIES</span>
            <h2>All Reviews</h2>
          </div>

          <div className="review-list">
            {clientReviews.map((review) => renderReviewCard(review))}
          </div>
        </section>
      )}

      {/* EMPTY STATE */}
      {!fetching && reviews.length === 0 && (
        <p className="no-reviews">
          {errorMessage
            ? 'Written reviews could not be loaded.'
            : 'Your story can inspire many — share your experience and make a difference. 💚'}
        </p>
      )}

      {/* HEALTH DISCLAIMER */}
      <aside
        className="testimonial-disclaimer"
        style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px'
        }}
      >
        <strong>Health &amp; Nutrition Disclaimer</strong>

        <p
          style={{
            fontSize: '14px',
            color: '#666',
            lineHeight: '1.6'
          }}
        >
          These videos and written reviews reflect individual experiences
          and personal opinions. They are not a guarantee of results or a
          prediction of what another person will experience. Nutrition
          needs and outcomes vary. Information on this page is for general
          educational and wellness purposes and does not replace medical
          diagnosis, treatment, or advice from a qualified healthcare
          professional. Please consult your healthcare professional about
          medical conditions, medications, symptoms, or changes to
          prescribed treatment.
        </p>
      </aside>
    </div>
  );
};

export default Reviews;
