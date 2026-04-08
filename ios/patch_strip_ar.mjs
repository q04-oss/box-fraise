import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/panels/VerifyNFCPanel.tsx';
let src = readFileSync(path, 'utf8');
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// Replace the entire alreadyVerified block (from reorderData to the reveal calls) with the lean version
const OLD = `      if (alreadyVerified) {
        const reorderData = await verifyNfcReorder(token);

        // Get device location for nearby AR notes (best-effort, 3s timeout)
        let deviceLat = 0, deviceLng = 0;
        await new Promise<void>((res) => {
          try {
            navigator.geolocation.getCurrentPosition(
              (pos) => { deviceLat = pos.coords.latitude; deviceLng = pos.coords.longitude; res(); },
              () => res(),
              { timeout: 3000, enableHighAccuracy: false }
            );
          } catch { res(); }
        });

        // Fetch all enrichment data in parallel
        const [healthCtx, varietyProfile, activeDrop, scannedVarieties, collectifRankData, nearbyNotes, wordCloud, batchMembers, streakLeaders, currentChallenge, bundleSuggestion, upcomingDrop, personalBestFlavor, lotCompanions] = await Promise.all([
          getTodayHealthContext().catch(() => null),
          reorderData.variety_id ? fetchVarietyProfile(reorderData.variety_id).catch(() => null) : Promise.resolve(null),
          reorderData.variety_id ? fetchActiveDropForVariety(reorderData.variety_id).catch(() => null) : Promise.resolve(null),
          fetchMyScannedVarieties().catch(() => [] as any[]),
          fetchCollectifRank().catch(() => null),
          fetchNearbyArNotes(deviceLat, deviceLng).catch(() => [] as any[]),
          reorderData.variety_id ? fetchTastingWordCloud(reorderData.variety_id).catch(() => [] as any[]) : Promise.resolve([]),
          reorderData.variety_id ? fetchBatchMembers(reorderData.variety_id).catch(() => [] as any[]) : Promise.resolve([]),
          reorderData.variety_id ? fetchVarietyStreakLeaders(reorderData.variety_id).catch(() => ({ leaders: [], my_rank: null })) : Promise.resolve({ leaders: [], my_rank: null }),
          fetchCurrentChallenge().catch(() => null),
          fetchBundleSuggestion().catch(() => null),
          reorderData.variety_id ? fetchUpcomingDrop(reorderData.variety_id).catch(() => null) : Promise.resolve(null),
          fetchPersonalBestFlavor().catch(() => null),
          reorderData.variety_id ? fetchLotCompanions(reorderData.variety_id).catch(() => [] as any[]) : Promise.resolve([]),
        ]);

        // AR Expanded 7: fetch poem and solar data (after varietyProfile to use farm coords)
        const vp = varietyProfile as any;
        const farmLat = vp?.farm_lat ?? null;
        const farmLng = vp?.farm_lng ?? null;
        const [arPoem, solarData] = await Promise.all([
          fetchArPoem({
            variety_name: reorderData.variety_name ?? undefined,
            farm: reorderData.farm ?? undefined,
            harvest_date: reorderData.harvest_date ?? undefined,
            brix_score: vp?.brix_score ?? undefined,
            terrain_type: vp?.terrain_type ?? undefined,
            moon_phase_at_harvest: vp?.moon_phase_at_harvest ?? undefined,
            growing_method: vp?.growing_method ?? undefined,
            farmer_name: vp?.farmer_name ?? undefined,
            flavor_profile: vp ? { sweetness: vp.sweetness, acidity: vp.acidity, aroma: vp.aroma, tasting_notes: vp.tasting_notes } : undefined,
          }).catch(() => null),
          (farmLat != null && farmLng != null) ? fetchSolarIrradiance(farmLat, farmLng).catch(() => null) : Promise.resolve(null),
        ]);

        // Feature C: format standing order label server data into display string
        let nextStandingOrderLabel: string | null = null;
        if (reorderData.next_standing_order) {
          const so = reorderData.next_standing_order;
          nextStandingOrderLabel = \`NEXT ORDER  ·  \${so.variety_name}  ·  in \${so.days_until} day\${so.days_until === 1 ? '' : 's'}\`;
        }

        // AR Expanded 5-6: referral bubble threshold (lifetime scan count)
        const totalScansRaw = await AsyncStorage.getItem('total_scan_count').catch(() => null);
        const totalScans = parseInt(totalScansRaw ?? '0', 10);
        await AsyncStorage.setItem('total_scan_count', String(totalScans + 1)).catch(() => {});
        const showReferralBubble = totalScans >= 3;

        // Compute unlocked achievements (client-side)
        const seenFarmsRaw = await AsyncStorage.getItem('seen_farms').catch(() => null);
        const seenFarms: string[] = seenFarmsRaw ? JSON.parse(seenFarmsRaw) : [];
        const farmName = reorderData.farm ?? '';
        if (farmName && !seenFarms.includes(farmName)) {
          seenFarms.push(farmName);
          AsyncStorage.setItem('seen_farms', JSON.stringify(seenFarms)).catch(() => {});
        }
        const unlockedAchievements = computeUnlockedAchievements({
          orderCount: reorderData.order_count ?? 0,
          varietyId: reorderData.variety_id,
          farmName,
          isWinterVariety: false,
          streakWeeks: reorderData.streak_weeks ?? 0,
          seenFarms,
        });

        // Is this the first time the user has scanned this variety?
        const seenKey = \`seen_variety_\${reorderData.variety_id}\`;
        const alreadySeen = await AsyncStorage.getItem(seenKey);
        const isFirstVariety = !alreadySeen;
        if (isFirstVariety) { AsyncStorage.setItem(seenKey, '1').catch(() => {}); }

        const arPayload: ARVarietyData = {
          variety_id: reorderData.variety_id,
          variety_name: reorderData.variety_name ?? null,
          farm: reorderData.farm ?? null,
          harvest_date: reorderData.harvest_date ?? null,
          quantity: reorderData.quantity,
          chocolate: reorderData.chocolate,
          finish: reorderData.finish,
          // Feature 1: HealthKit nutrition
          vitamin_c_today_mg: (healthCtx as any)?.dietaryVitaminC ?? null,
          calories_today_kcal: (healthCtx as any)?.dietaryEnergyConsumed ?? null,
          // Feature 3: Collectif social layer
          collectif_pickups_today: reorderData.collectif_pickups_today ?? 0,
          // Feature 4: Gift reveal
          is_gift: reorderData.is_gift ?? false,
          gift_note: reorderData.gift_note ?? null,
          // Feature 5: Variety streak
          order_count: reorderData.order_count ?? 0,
          // Feature B: last variety
          last_variety: reorderData.last_variety ?? null,
          // Feature C: standing order label
          next_standing_order_label: nextStandingOrderLabel,
          // Feature D: collectif member names
          collectif_member_names: reorderData.collectif_member_names ?? [],
          // AR Expanded 2: enrichment
          flavor_profile: varietyProfile ?? null,
          farm_distance_km: varietyProfile?.farm_distance_km ?? null,
          season_start: reorderData.season_start ?? null,
          season_end: reorderData.season_end ?? null,
          active_drop: activeDrop ? { id: activeDrop.id, title: activeDrop.title, price_cents: activeDrop.price_cents } : null,
          is_first_variety: isFirstVariety,
          // AR Expanded 3: new enrichment
          brix_score: varietyProfile?.brix_score ?? null,
          growing_method: varietyProfile?.growing_method ?? null,
          moon_phase_at_harvest: varietyProfile?.moon_phase_at_harvest ?? null,
          parent_a: varietyProfile?.parent_a ?? null,
          parent_b: varietyProfile?.parent_b ?? null,
          altitude_m: varietyProfile?.altitude_m ?? null,
          soil_type: varietyProfile?.soil_type ?? null,
          eat_by_days: varietyProfile?.eat_by_days ?? null,
          recipe_name: varietyProfile?.recipe_name ?? null,
          recipe_description: varietyProfile?.recipe_description ?? null,
          harvest_weather_json: varietyProfile?.harvest_weather_json ?? null,
          farm_photo_url: varietyProfile?.farm_photo_url ?? null,
          producer_video_url: varietyProfile?.producer_video_url ?? null,
          streak_weeks: reorderData.streak_weeks ?? null,
          collectif_rank: collectifRankData?.rank ?? null,
          collectif_total_members: collectifRankData?.total_members ?? null,
          scanned_varieties: scannedVarieties ?? [],
          // AR Expanded 4: new enrichment
          fiber_today_g: (healthCtx as any)?.dietaryFiber ?? null,
          allergy_flags: [],
          unlocked_achievements: unlockedAchievements,
          collectif_milestone_pct: reorderData.collectif_milestone_pct ?? null,
          co2_grams: (varietyProfile as any)?.co2_grams ?? null,
          carbon_offset_program: (varietyProfile as any)?.carbon_offset_program ?? null,
          sunlight_hours: (varietyProfile as any)?.sunlight_hours ?? null,
          price_history_json: (varietyProfile as any)?.price_history_json ?? null,
          nearby_ar_notes: nearbyNotes ?? [],
          // AR Expanded 5-6: science & sensory
          personal_best_flavor: (personalBestFlavor as any) ?? null,
          orac_value: (varietyProfile as any)?.orac_value ?? null,
          fermentation_profile: (() => { try { const j = (varietyProfile as any)?.fermentation_profile_json; return j ? JSON.parse(j) : null; } catch { return null; } })(),
          hue_value: (varietyProfile as any)?.hue_value ?? null,
          folate_mcg: (varietyProfile as any)?.folate_mcg ?? null,
          manganese_mg: (varietyProfile as any)?.manganese_mg ?? null,
          potassium_mg: (varietyProfile as any)?.potassium_mg ?? null,
          vitamin_k_mcg: (varietyProfile as any)?.vitamin_k_mcg ?? null,
          // AR Expanded 5-6: farm storytelling
          farmer_name: (varietyProfile as any)?.farmer_name ?? null,
          farmer_quote: (varietyProfile as any)?.farmer_quote ?? null,
          certifications: (() => { try { return JSON.parse((varietyProfile as any)?.certifications_json ?? '[]'); } catch { return []; } })(),
          farm_founded_year: (varietyProfile as any)?.farm_founded_year ?? null,
          farm_milestones: (() => { try { return JSON.parse((varietyProfile as any)?.farm_milestones_json ?? '[]'); } catch { return []; } })(),
          irrigation_method: (varietyProfile as any)?.irrigation_method ?? null,
          cover_crop: (varietyProfile as any)?.cover_crop ?? null,
          terrain_type: (varietyProfile as any)?.terrain_type ?? null,
          prevailing_wind: (varietyProfile as any)?.prevailing_wind ?? null,
          ambient_audio_url: (varietyProfile as any)?.ambient_audio_url ?? null,
          mascot_id: (varietyProfile as any)?.mascot_id ?? null,
          // AR Expanded 5-6: commerce
          bundle_suggestion: (bundleSuggestion as any) ?? null,
          upcoming_drop_at: (upcomingDrop as any)?.upcoming_drop_at ?? null,
          price_drop_pct: (() => {
            const hist = (varietyProfile as any)?.price_history_json;
            if (!hist) return null;
            try {
              const pts = JSON.parse(hist) as Array<{ season: string; priceCents: number }>;
              if (pts.length < 2) return null;
              const latest = pts[pts.length - 1].priceCents;
              const prev = pts[pts.length - 2].priceCents;
              if (prev <= 0) return null;
              const drop = Math.round((prev - latest) / prev * 100);
              return drop > 0 ? drop : null;
            } catch { return null; }
          })(),
          show_referral_bubble: showReferralBubble,
          // AR Expanded 5-6: social
          tasting_word_cloud: (wordCloud as any[]) ?? [],
          batch_members: (batchMembers as any[]) ?? [],
          last_scan_date: reorderData.last_scan_date ?? null,
          last_scan_rating: reorderData.last_scan_rating ?? null,
          last_scan_note: reorderData.last_scan_note ?? null,
          collectif_challenge: (currentChallenge as any) ?? null,
          variety_streak_leaders: (streakLeaders as any)?.leaders ?? (Array.isArray(streakLeaders) ? streakLeaders : []),
          current_user_streak_rank: (streakLeaders as any)?.my_rank ?? null,
          // AR Expanded 7
          farm_webcam_url: vp?.farm_webcam_url ?? null,
          ar_poem: arPoem ?? null,
          solar_data: solarData ?? null,
          // Social expanded
          lot_companions: (lotCompanions as any[]) ?? [],
          // Batch provenance
          batch_delivery_date: reorderData.batch_delivery_date ?? null,
          batch_triggered_at: reorderData.batch_triggered_at ?? null,
          batch_notes: reorderData.batch_notes ?? null,
        };
        setRevealData({
          variety_name: reorderData.variety_name ?? 'Strawberry',
          tasting_notes: (varietyProfile as any)?.tasting_notes ?? null,
          location_id: reorderData.location_id ?? null,
        });
        setState('revealed');
        TrueSheet.present('main-sheet', 2).catch(() => {});`;

const NEW = `      if (alreadyVerified) {
        const reorderData = await verifyNfcReorder(token);
        setRevealData({
          variety_name: reorderData.variety_name ?? 'Strawberry',
          tasting_notes: null,
          location_id: reorderData.location_id ?? null,
        });
        setState('revealed');
        TrueSheet.present('main-sheet', 2).catch(() => {});`;

if (!src.includes(OLD)) { console.error('target not found'); process.exit(1); }
src = src.replace(OLD, NEW);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
writeFileSync(path, src, 'utf8');
console.log('Done');
