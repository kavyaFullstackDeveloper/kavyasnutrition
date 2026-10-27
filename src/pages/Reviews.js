import React, { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa';
import './Reviews.css';

import { auth, provider, db, storage } from '../firebase.js';

import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';

import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  where,
} from 'firebase/firestore';

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

import { v4 as uuidv4 } from 'uuid';

/* =========================================================
   YOUTUBE CLIENT EXPERIENCE VIDEOS
   Replace titles only after checking the actual video content.
========================================================= */

const testimonialVideos = [
  {
    id: '0fyEsfsoQgI',
    title: 'Client Experience 01',
  },
  {
    id: 'wzlBQvSL5Gs',
    title: 'Client Experience 02',
  },
  {
    id: 'd2w5D0PhFFM',
    title: 'Client Experience 03',
  },
  {
    id: 'bF2D7n0JCoc',
    title: 'Client Experience 04',
  },
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const Reviews = () => {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    review: '',
    rating: 0,
    image: null,
    imagePreview: null,
    publicConsent: false,
    photoConsent: false,
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
     FETCH APPROVED REVIEWS ONLY

     Note:
     Existing records without status: "approved" will not
     appear until reviewed and approved.
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchReviews = async () => {
      setFetching(true);
      setErrorMessage('');

      try {
        const reviewsQuery = query(
          collection(db, 'review'),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(reviewsQuery);

        const data = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        if (!cancelled) {
          setReviews(data);
        }
      } catch (error) {
        console.error('Error fetching approved reviews:', error);

        if (!cancelled) {
          setErrorMessage(
            'Client experiences could not be loaded right now. Please try again later.'
          );
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    };

    fetchReviews();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     GOOGLE LOGIN
  ========================================================= */

  const handleLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google login failed:', error);

      setErrorMessage(
        'Google sign-in was unsuccessful. Please try again.'
      );
    }
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);

      setErrorMessage('Unable to sign out right now. Please try again.');
    }
  };

  /* =========================================================
     FORM CHANGE
  ========================================================= */

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  /* =========================================================
     STAR RATING
  ========================================================= */

  const handleRating = (ratingValue) => {
    setFormData((previous) => ({
      ...previous,
      rating: ratingValue,
    }));
  };

  /* =========================================================
     IMAGE UPLOAD PREVIEW
  ========================================================= */

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('');

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please choose a valid image file.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage('Please select an image smaller than 5 MB.');
      event.target.value = '';
      return;
    }

    setFormData((previous) => {
      if (previous.imagePreview) {
        URL.revokeObjectURL(previous.imagePreview);
      }

      return {
        ...previous,
        image: file,
        imagePreview: URL.createObjectURL(file),
      };
    });
  };

  const removeImage = () => {
    setFormData((previous) => {
      if (previous.imagePreview) {
        URL.revokeObjectURL(previous.imagePreview);
      }

      return {
        ...previous,
        image: null,
        imagePreview: null,
      };
    });
  };

  /* =========================================================
     SUBMIT REVIEW

     Reviews are saved as pending.
     They must be moderated before public display.
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    if (!user) {
      setErrorMessage('Please sign in with Google before submitting.');
      return;
    }

    if (!formData.review.trim()) {
      setErrorMessage('Please enter your review.');
      return;
    }

    if (formData.review.trim().length < 10) {
      setErrorMessage('Please write a little more about your experience.');
      return;
    }

    if (formData.review.trim().length > 2000) {
      setErrorMessage('Your review must be under 2,000 characters.');
      return;
    }

    if (formData.rating < 1 || formData.rating > 5) {
      setErrorMessage('Please select a star rating.');
      return;
    }

    if (!formData.publicConsent) {
      setErrorMessage(
        'Please confirm your consent for your review to be considered for public display.'
      );
      return;
    }

    if (formData.image && !formData.photoConsent) {
      setErrorMessage(
        'Please confirm whether you consent to your uploaded photo being displayed.'
      );
      return;
    }

    setLoading(true);

    try {
      let imageUrl = '';

      if (formData.image) {
        const safeFileName = formData.image.name.replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        );

        const imagePath = `review/${user.uid}/${uuidv4()}-${safeFileName}`;
        const imageReference = ref(storage, imagePath);

        await uploadBytes(imageReference, formData.image);
        imageUrl = await getDownloadURL(imageReference);
      }

      await addDoc(collection(db, 'review'), {
        uid: user.uid,
        name: user.displayName || 'Client',
        review: formData.review.trim(),
        rating: Number(formData.rating),
        imageUrl,
        photoConsent: Boolean(formData.image && formData.photoConsent),
        publicConsent: true,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      if (formData.imagePreview) {
        URL.revokeObjectURL(formData.imagePreview);
      }

      setFormData({
        review: '',
        rating: 0,
        image: null,
        imagePreview: null,
        publicConsent: false,
        photoConsent: false,
      });

      const fileInput = document.getElementById('review-photo');
      if (fileInput) fileInput.value = '';

      setSuccessMessage(
        'Thank you for sharing your experience! Your review has been submitted for review before it appears publicly.'
      );
    } catch (error) {
      console.error('Review submission failed:', error);

      setErrorMessage(
        'We could not submit your review. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CLEAN UP IMAGE PREVIEW URL ON UNMOUNT
  ========================================================= */

  useEffect(() => {
    return () => {
      if (formData.imagePreview) {
        URL.revokeObjectURL(formData.imagePreview);
      }
    };
  }, [formData.imagePreview]);

  /* =========================================================
     REVIEW CARD
  ========================================================= */

  const renderReviewCard = (review) => (
    <article key={review.id} className="review-card">
      <div className="content">
        {review.imageUrl && review.photoConsent === true && (
          <img
            src={review.imageUrl}
            alt=""
            className="client-image"
            loading="lazy"
          />
        )}

        <div className="review-content">
          <p className="name">{review.name || 'Client'}</p>

          <div
            className="rating"
            aria-label={`${review.rating} out of 5 stars`}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <FaStar
                key={value}
                size={15}
                color={
                  value <= review.rating ? '#c89b3c' : '#e1e4e1'
                }
                aria-hidden="true"
              />
            ))}
          </div>

          <p className="review">{review.review}</p>
        </div>
      </div>
    </article>
  );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="reviews-container">
      {/* PAGE HEADER */}

      <header className="reviews-header">
        <span className="reviews-eyebrow">
          CLIENT EXPERIENCES • INDIVIDUAL JOURNEYS
        </span>

        <h1 className="reviews-title">Client Experiences</h1>

        <p className="reviews-intro">
          Every health journey is unique. Explore personal experiences
          shared by people who have worked with Kavya’s Nutrition.
        </p>
      </header>

      {/* VIDEO EXPERIENCES */}

      <section className="video-testimonials">
        <div className="video-section-heading">
          <span className="section-eyebrow">VIDEO EXPERIENCES</span>

          <h2>In Their Own Words</h2>

          <p>
            These videos share individual experiences. They do not
            guarantee or predict the results another person may achieve.
          </p>
        </div>

        <div className="testimonial-video-grid">
          {testimonialVideos.map((video) => (
            <article className="testimonial-video-card" key={video.id}>
              <div className="video-wrapper">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                  title={video.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>

              <div className="video-card-content">
                <span className="video-label">CLIENT EXPERIENCE</span>
                <h3>{video.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SIGN-IN */}

      <section className="review-access">
        {!user ? (
          <div className="login-box">
            <div className="login-content">
              <span className="login-icon" aria-hidden="true">
                💬
              </span>

              <div>
                <h3>Have you worked with me?</h3>
                <p>
                  You can share your experience to help others understand
                  what working with a nutrition professional may involve.
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
              />
              Sign in with Google to share your experience
            </button>
          </div>
        ) : (
          <div className="logged-user">
            <span>
              Signed in as <strong>{user.displayName || user.email}</strong>
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

      {/* STATUS MESSAGES */}

     
      {successMessage && (
        <p className="review-message review-success" role="status">
          {successMessage}
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
            <label htmlFor="review-text">Your review</label>

            <textarea
              id="review-text"
              name="review"
              placeholder="Share your experience in your own words..."
              value={formData.review}
              onChange={handleChange}
              rows={5}
              maxLength={2000}
              required
            />

            <div className="review-character-count">
              {formData.review.length}/2000 characters
            </div>

            {/* STAR RATING */}

            <fieldset className="rating-input">
              <legend>Your Rating</legend>

              <div className="star-selector">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="star-button"
                    onClick={() => handleRating(value)}
                    aria-label={`Rate ${value} out of 5 stars`}
                    aria-pressed={formData.rating === value}
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
            </fieldset>

            {/* OPTIONAL PHOTO */}

            <div className="image-upload">
              <label htmlFor="review-photo">
                Add a photo <span>(optional, maximum 5 MB)</span>
              </label>

              <input
                id="review-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
              />
            </div>

            {formData.imagePreview && (
              <div className="image-preview-wrap">
                <img
                  src={formData.imagePreview}
                  alt="Preview of the photo you selected"
                  className="image-preview"
                />

                <button type="button" onClick={removeImage}>
                  Remove photo
                </button>
              </div>
            )}

            {formData.image && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="photoConsent"
                  checked={formData.photoConsent}
                  onChange={handleChange}
                  required
                />

                <span>
                  I consent to this photo being displayed publicly with my
                  review if the review is approved.
                </span>
              </label>
            )}

            {/* PUBLIC DISPLAY CONSENT */}

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="publicConsent"
                checked={formData.publicConsent}
                onChange={handleChange}
                required
              />

              <span>
                I consent to my review and Google display name being
                considered for public display on Kavya’s Nutrition after
                moderation. I understand that submission does not guarantee
                publication, and I can contact the website owner to request
                removal of my published review.
              </span>
            </label>

            <p className="review-form-note">
              Please avoid including medical reports, private contact
              details, or other sensitive personal information in your
              review.
            </p>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit for Review →'}
            </button>
          </form>
        </section>
      )}

      {/* APPROVED CLIENT REVIEWS */}

      <section className="all-reviews">
        <div className="section-heading">
          <span className="section-eyebrow">SHARED EXPERIENCES</span>
          <h2>In Their Own Words</h2>
        </div>

        {fetching ? (
          <div className="spinner" role="status">
            Loading client experiences...
          </div>
        ) : reviews.length > 0 ? (
          <div className="review-list">
            {reviews.map(renderReviewCard)}
          </div>
        ) : (
          <p className="no-reviews">
            Client experiences will appear here soon.
          </p>
        )}
      </section>


      {/* DISCLAIMER */}

      <aside className="testimonial-disclaimer">
        <strong>Health &amp; Nutrition Disclaimer</strong>
        <p>
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
    </main>
  );
};

export default Reviews;
