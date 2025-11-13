import React, { useState } from 'react';
import axios from 'axios';

const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://backend.vjcoverseas.com';

const UploadOfferLetter = () => {
  const [offerLetterEmail, setOfferLetterEmail] = useState('');
  const [offerLetterFile, setOfferLetterFile] = useState(null);
  const [offerLetterMsg, setOfferLetterMsg] = useState('');

  const handleOfferLetterUpload = async () => {
    setOfferLetterMsg('');
    if (!offerLetterEmail.trim() || !offerLetterFile) {
      setOfferLetterMsg('Please provide both an email and an offer letter file.');
      return;
    }
    const formData = new FormData();
    formData.append('email', offerLetterEmail);
    formData.append('offerLetter', offerLetterFile);

    try {
      await axios.post(`${baseUrl}/upload-offer-letter`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setOfferLetterMsg('Offer letter uploaded successfully!');
      setOfferLetterEmail('');
      setOfferLetterFile(null);
    } catch (err) {
      setOfferLetterMsg(`Failed to upload: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <section aria-labelledby="offer-letter-heading" style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', marginBottom: 40 }}>
      <h2 id="offer-letter-heading" style={{ color: '#60a5fa', fontWeight: 700, marginBottom: 18 }}>Upload Offer Letter</h2>
      <p>You can upload an offer letter for any existing user by their email.</p>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
        <input
          type="email"
          placeholder="Employee Email"
          value={offerLetterEmail}
          onChange={e => setOfferLetterEmail(e.target.value)}
          style={{ flex: 2, padding: '10px 14px', borderRadius: 8, border: '2px solid #d1d5db', fontSize: 15, outlineOffset: 2, boxSizing: 'border-box' }}
          aria-label="Enter employee email to upload offer letter"
        />
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={e => setOfferLetterFile(e.target.files[0])}
          style={{ flex: 3, padding: '10px 14px', borderRadius: 8, border: '2px solid #d1d5db', fontSize: 15 }}
          aria-label="Select offer letter file"
        />
      </div>
      {offerLetterFile && (
        <p style={{ marginTop: 8, fontWeight: 600, color: '#374151' }}>
          Selected file: {offerLetterFile.name}
        </p>
      )}
      <button
        type="button"
        onClick={handleOfferLetterUpload}
        style={{
          cursor: 'pointer',
          padding: '10px 22px',
          borderRadius: 8,
          border: 'none',
          fontWeight: 700,
          fontSize: 16,
          backgroundColor: '#f97316',
          color: '#fff',
          userSelect: 'none',
          transition: 'background-color 0.3s ease',
          marginTop: 12
        }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = '#ea580c'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = '#f97316'}
      >
        Upload Letter
      </button>
      {offerLetterMsg && (
        <p style={{
          color: offerLetterMsg.startsWith('Failed') ? '#ef4444' : '#22c55e',
          fontWeight: 600,
          marginTop: 12
        }}>
          {offerLetterMsg}
        </p>
      )}
    </section>
  );
};

export default UploadOfferLetter;
