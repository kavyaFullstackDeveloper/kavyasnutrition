
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';

import logo from '../assets/knlogo.png';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Wellness Hub' },
    { path: '/about', label: 'Meet Kavya' },
    { path: '/reviews', label: 'Success Stories' },
    { path: '/research', label: 'Research' },
  ];

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link
          to="/"
          className="navbar-logo"
          onClick={closeMenu}
          aria-label="Kavya's Nutrition Home"
        >
          <img src={logo} alt="Kavya's Nutrition" />
        </Link>

        <nav
          id="main-navigation"
          className={`nav-links ${menuOpen ? 'open' : ''}`}
          aria-label="Main navigation"
        >
          {navItems.map(({ path, label }) => {
            const isActive =
              path === '/'
                ? location.pathname === '/'
                : location.pathname === path ||
                  location.pathname.startsWith(`${path}/`);

            return (
              <Link
                key={path}
                to={path}
                className={`nav-link${isActive ? ' active' : ''}`}
                onClick={closeMenu}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          })}

          <Link
            to="/contact"
            className={`nav-cta${
              location.pathname === '/contact' ? ' active' : ''
            }`}
            onClick={closeMenu}
          >
            <span>Book a Session</span>
            <span className="cta-arrow" aria-hidden="true">→</span>
          </Link>
        </nav>

        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-controls="main-navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>
    </header>
  );
};

export default Navbar;
