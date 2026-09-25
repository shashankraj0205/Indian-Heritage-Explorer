import { NEARBY_STAYS_FOOD_DATABASE, SiteTravelGuide, getNearbyGuideForSite } from './nearby-stays-food-data';

let activeCategoryFilter: 'all' | 'homestay' | 'hotel' | 'restaurant' = 'all';

/**
 * Generate the HTML markup for the Nearby Stays & Dining experience
 */
export function generateStayAndDineHTML(guide: SiteTravelGuide): string {
  const filteredHomestays = activeCategoryFilter === 'all' || activeCategoryFilter === 'homestay' ? guide.homestays : [];
  const filteredHotels = activeCategoryFilter === 'all' || activeCategoryFilter === 'hotel' ? guide.hotels : [];
  const filteredRestaurants = activeCategoryFilter === 'all' || activeCategoryFilter === 'restaurant' ? guide.restaurants : [];

  return `
    <div class="stay-dine-container" style="display:flex;flex-direction:column;gap:18px;animation:fadeIn 0.25s ease;">
      <!-- Local Food Culture Highlight Banner -->
      <div style="background:linear-gradient(135deg, #FAF8F5 0%, #F5ECE5 100%);border:1px solid #D6D7BE;border-left:4px solid #C9974A;border-radius:12px;padding:14px 16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:20px;">🍲</span>
          <h4 style="font-family:'Playfair Display',serif;font-size:15.5px;font-weight:700;color:#5A2A22;">
            Local Culinary Heritage of ${guide.city}, ${guide.state}
          </h4>
        </div>
        <p style="font-size:13px;line-height:1.55;color:#4A3D36;">
          ${guide.localFoodCulture}
        </p>
      </div>

      <!-- Quick Filter Chips -->
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;" class="stay-filter-bar">
        <button class="stay-filter-chip ${activeCategoryFilter === 'all' ? 'active' : ''}" data-filter="all">
          🌟 All (${guide.homestays.length + guide.hotels.length + guide.restaurants.length})
        </button>
        <button class="stay-filter-chip ${activeCategoryFilter === 'homestay' ? 'active' : ''}" data-filter="homestay">
          🏡 Homestays (${guide.homestays.length})
        </button>
        <button class="stay-filter-chip ${activeCategoryFilter === 'hotel' ? 'active' : ''}" data-filter="hotel">
          🏨 Hotels (${guide.hotels.length})
        </button>
        <button class="stay-filter-chip ${activeCategoryFilter === 'restaurant' ? 'active' : ''}" data-filter="restaurant">
          🍽️ Restaurants & Food (${guide.restaurants.length})
        </button>
      </div>

      <!-- HOMESTAYS SECTION -->
      ${filteredHomestays.length > 0 ? `
        <div class="stay-section-block">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <h4 style="font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#5A2A22;display:flex;align-items:center;gap:6px;">
              <span>🏡</span> Nearby Authentic Homestays
            </h4>
            <span style="font-size:11px;color:#7A6A5F;background:#FFF;border:1px solid #D6D7BE;padding:2px 8px;border-radius:12px;">Local Family Stays</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px;">
            ${filteredHomestays.map((hs) => `
              <div style="background:#FFFFFF;border:1px solid #D6D7BE;border-radius:12px;padding:14px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.04);transition:transform 0.2s ease,border-color 0.2s ease;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
                  <div>
                    <h5 style="font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#2E211D;line-height:1.25;">
                      ${hs.name}
                    </h5>
                    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#7A6A5F;margin-top:2px;">
                      <span>📍 ${hs.location}</span>
                      <span>•</span>
                      <span style="color:#B85042;font-weight:600;">${hs.distanceFromSite}</span>
                    </div>
                  </div>
                  <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:14px;font-weight:700;color:#B85042;background:#FDF5E8;border:1px solid #EBD5B3;padding:4px 10px;border-radius:14px;">
                      ${hs.pricePerNight}
                    </div>
                    <span style="font-size:11px;color:#C9974A;font-weight:700;margin-top:2px;display:block;">★ ${hs.rating} / 5</span>
                  </div>
                </div>

                <p style="font-size:12.5px;color:#4A3D36;line-height:1.5;margin-bottom:10px;background:#FAF8F5;padding:8px 10px;border-radius:8px;">
                  <strong>Host Experience:</strong> ${hs.hostExperience}
                </p>

                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
                  ${hs.amenities.map((a) => `<span style="font-size:11px;background:#F4F5E7;color:#5A2A22;padding:2px 8px;border-radius:8px;border:1px solid #D6D7BE;">${a}</span>`).join('')}
                </div>

                <div style="display:flex;justify-content:flex-end;border-top:1px solid #F0EBE4;padding-top:8px;">
                  <a href="${hs.link}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#B85042;color:#FFF;font-size:12px;font-weight:600;padding:6px 14px;border-radius:18px;text-decoration:none;transition:background 0.2s ease;">
                    <span>View Homestay & Book</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- HOTELS SECTION -->
      ${filteredHotels.length > 0 ? `
        <div class="stay-section-block">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <h4 style="font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#5A2A22;display:flex;align-items:center;gap:6px;">
              <span>🏨</span> Hotels & Heritage Palaces
            </h4>
            <span style="font-size:11px;color:#7A6A5F;background:#FFF;border:1px solid #D6D7BE;padding:2px 8px;border-radius:12px;">Luxury & Comfort</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px;">
            ${filteredHotels.map((h) => `
              <div style="background:#FFFFFF;border:1px solid #D6D7BE;border-radius:12px;padding:14px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <h5 style="font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#2E211D;line-height:1.25;">
                        ${h.name}
                      </h5>
                      <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;padding:2px 6px;border-radius:10px;background:#F4F5E7;color:#5A2A22;font-weight:600;">
                        ${h.category}
                      </span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#7A6A5F;margin-top:2px;">
                      <span>📍 ${h.location}</span>
                      <span>•</span>
                      <span style="color:#B85042;font-weight:600;">${h.distanceFromSite}</span>
                    </div>
                  </div>
                  <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:14px;font-weight:700;color:#5A2A22;background:#FDF5E8;border:1px solid #EBD5B3;padding:4px 10px;border-radius:14px;">
                      ${h.pricePerNight}
                    </div>
                    <span style="font-size:11px;color:#C9974A;font-weight:700;margin-top:2px;display:block;">★ ${h.rating} / 5</span>
                  </div>
                </div>

                <p style="font-size:12.5px;color:#4A3D36;line-height:1.5;margin-bottom:10px;">
                  ${h.description}
                </p>

                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
                  ${h.amenities.map((a) => `<span style="font-size:11px;background:#F4F5E7;color:#5A2A22;padding:2px 8px;border-radius:8px;border:1px solid #D6D7BE;">${a}</span>`).join('')}
                </div>

                <div style="display:flex;justify-content:flex-end;border-top:1px solid #F0EBE4;padding-top:8px;">
                  <a href="${h.link}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#5A2A22;color:#FFF;font-size:12px;font-weight:600;padding:6px 14px;border-radius:18px;text-decoration:none;transition:background 0.2s ease;">
                    <span>View Hotel Details</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- RESTAURANTS SECTION -->
      ${filteredRestaurants.length > 0 ? `
        <div class="stay-section-block">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <h4 style="font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#5A2A22;display:flex;align-items:center;gap:6px;">
              <span>🍽️</span> Nearby Restaurants & Signature Foods
            </h4>
            <span style="font-size:11px;color:#7A6A5F;background:#FFF;border:1px solid #D6D7BE;padding:2px 8px;border-radius:12px;">Local Delicacies</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px;">
            ${filteredRestaurants.map((r) => `
              <div style="background:#FFFFFF;border:1px solid #D6D7BE;border-radius:12px;padding:14px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;">
                  <div>
                    <h5 style="font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#2E211D;line-height:1.25;">
                      ${r.name}
                    </h5>
                    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#7A6A5F;margin-top:2px;">
                      <span>🍴 ${r.cuisine}</span>
                      <span>•</span>
                      <span style="color:#B85042;font-weight:600;">${r.distanceFromSite}</span>
                    </div>
                  </div>
                  <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:13px;font-weight:700;color:#B85042;background:#FDF5E8;border:1px solid #EBD5B3;padding:4px 10px;border-radius:14px;">
                      ${r.priceForTwo}
                    </div>
                    <span style="font-size:11px;color:#C9974A;font-weight:700;margin-top:2px;display:block;">★ ${r.rating} / 5</span>
                  </div>
                </div>

                <div style="margin:8px 0;">
                  <span style="font-size:11.5px;font-weight:700;color:#5A2A22;display:block;margin-bottom:4px;">
                    ✨ Must-Try Signature Foods:
                  </span>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${r.signatureFoods.map((f) => `<span style="font-size:11.5px;background:#FDF0DC;color:#8A5814;font-weight:600;padding:2px 9px;border-radius:12px;border:1px solid #FCD34D;">${f}</span>`).join('')}
                  </div>
                </div>

                <p style="font-size:12px;color:#4A3D36;line-height:1.45;margin-bottom:10px;">
                  ${r.description}
                </p>

                <div style="display:flex;justify-content:flex-end;border-top:1px solid #F0EBE4;padding-top:8px;">
                  <a href="${r.link}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#C9974A;color:#FFF;font-size:12px;font-weight:600;padding:6px 14px;border-radius:18px;text-decoration:none;transition:background 0.2s ease;">
                    <span>📍 Google Maps & Menu</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render directly inside the detail slide panel
 */
export function renderStayAndDineForSite(site: { id: string; name: string }) {
  const storyContentArea = document.getElementById('storyContentArea');
  if (!storyContentArea) return;

  const guide = getNearbyGuideForSite(site.id);
  storyContentArea.innerHTML = generateStayAndDineHTML(guide);

  // Wire filter chips
  storyContentArea.querySelectorAll('.stay-filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const filter = chip.getAttribute('data-filter') as any;
      activeCategoryFilter = filter || 'all';
      renderStayAndDineForSite(site);
    });
  });
}

/**
 * Open a dedicated full-screen modal overlay showing stays & food for any site
 */
export function openNearbyStaysModal(siteId: string) {
  const guide = getNearbyGuideForSite(siteId);

  const existing = document.getElementById('stayDineModalBackdrop');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'stayDineModalBackdrop';
  modal.className = 'auth-modal-backdrop open';
  modal.innerHTML = `
    <div class="auth-dialog" role="dialog" aria-modal="true" style="max-width:640px;max-height:90vh;">
      <div class="auth-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:26px;">🏨</span>
            <div>
              <h3 style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;">
                Stays & Dining: ${guide.siteName}
              </h3>
              <p style="font-size:11.5px;color:#F7DFA8;margin-top:2px;">
                Verified nearby homestays, hotels, restaurants & prices in ${guide.city}, ${guide.state}
              </p>
            </div>
          </div>
          <button id="closeStayDineModal" style="color:#FFF;background:rgba(255,255,255,0.15);width:30px;height:30px;border-radius:50%;font-size:18px;cursor:pointer;">&times;</button>
        </div>
      </div>

      <div id="modalStayDineContent" style="padding:20px 24px;overflow-y:auto;flex:1;">
        ${generateStayAndDineHTML(guide)}
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#closeStayDineModal')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Wire filter chips inside modal
  const contentArea = modal.querySelector('#modalStayDineContent');
  if (contentArea) {
    contentArea.querySelectorAll('.stay-filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const filter = chip.getAttribute('data-filter') as any;
        activeCategoryFilter = filter || 'all';
        contentArea.innerHTML = generateStayAndDineHTML(guide);
        openNearbyStaysModal(siteId); // re-render
      });
    });
  }
}

// Inject CSS styles for filter chips
function injectStayDineStyles() {
  if (document.getElementById('stay-dine-styles')) return;
  const style = document.createElement('style');
  style.id = 'stay-dine-styles';
  style.textContent = `
    .stay-filter-chip {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background: #FFFFFF;
      border: 1px solid #D6D7BE;
      color: #5A2A22;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
    }
    .stay-filter-chip:hover {
      background: #F4F5E7;
      border-color: #B85042;
    }
    .stay-filter-chip.active {
      background: #5A2A22;
      color: #FFFFFF;
      border-color: #5A2A22;
    }
    .card-stay-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(201, 151, 74, 0.12);
      border: 1px solid rgba(201, 151, 74, 0.4);
      color: #8A5814;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .card-stay-pill-btn:hover {
      background: #C9974A;
      color: #FFFFFF;
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(style);
}

// Auto-inject styles
if (typeof document !== 'undefined') {
  injectStayDineStyles();
}

// Expose to window for index.html integration
(window as any).openNearbyStaysModal = openNearbyStaysModal;
(window as any).renderStayAndDineForSite = renderStayAndDineForSite;
