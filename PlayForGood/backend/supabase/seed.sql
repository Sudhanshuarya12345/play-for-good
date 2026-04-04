insert into public.charities (name, slug, short_description, long_description, image_url, is_featured)
values
  (
    'Hope Caddies Foundation',
    'hope-caddies-foundation',
    'Education grants for caddie families and youth skill-building scholarships.',
    'Hope Caddies Foundation supports children from golf-support communities with school grants, mentorship, and vocational training programs.',
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1600&q=80',
    true
  ),
  (
    'Green Horizon Clinics',
    'green-horizon-clinics',
    'Mobile preventive healthcare camps for underserved neighborhoods.',
    'Green Horizon Clinics runs early detection drives, health records outreach, and treatment navigation for low-income communities.',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1600&q=80',
    false
  ),
  (
    'Girls in Motion India',
    'girls-in-motion-india',
    'Sports-led confidence and leadership programs for adolescent girls.',
    'Girls in Motion India builds safe spaces where girls access coaching, wellness guidance, and mentorship through structured sports activity.',
    'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1600&q=80',
    false
  ),
  (
    'Fair Chance Learning Labs',
    'fair-chance-learning-labs',
    'Digital literacy and STEM kits for public school students.',
    'Fair Chance Learning Labs equips schools with after-hours digital labs and practical STEM workshops led by trained volunteers.',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1600&q=80',
    false
  ),
  (
    'Urban Relief Food Network',
    'urban-relief-food-network',
    'Community kitchens and meal security programs for vulnerable households.',
    'Urban Relief Food Network coordinates hyper-local meal hubs and nutrition packs for families facing short-term income disruptions.',
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1600&q=80',
    false
  ),
  (
    'Blue Shield Wildlife Trust',
    'blue-shield-wildlife-trust',
    'Habitat recovery and rescue support for endangered species zones.',
    'Blue Shield Wildlife Trust funds veterinary rescue units, habitat restoration, and ranger training for high-risk ecological corridors.',
    'https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&w=1600&q=80',
    false
  ),
  (
    'Dignity Homes Initiative',
    'dignity-homes-initiative',
    'Rapid shelter upgrades and sanitation for climate-affected families.',
    'Dignity Homes Initiative helps disaster-prone communities retrofit homes, improve sanitation systems, and recover safely after severe weather.',
    'https://images.unsplash.com/photo-1469571486292-b53601020c0b?auto=format&fit=crop&w=1600&q=80',
    false
  ),
  (
    'Bright Futures Mental Health',
    'bright-futures-mental-health',
    'Youth counseling and resilience support in low-access communities.',
    'Bright Futures Mental Health provides culturally aware counseling, peer circles, and crisis pathways for teenagers and young adults.',
    'https://images.unsplash.com/photo-1573497491765-dccce02b29df?auto=format&fit=crop&w=1600&q=80',
    false
  )
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  long_description = excluded.long_description,
  image_url = excluded.image_url,
  is_featured = excluded.is_featured,
  updated_at = timezone('utc', now());

insert into public.charity_events (charity_id, title, details, event_date, location)
select c.id,
       'Charity Golf Day 2026',
       'Fundraising day with subscriber participation and youth mentorship sessions.',
       date '2026-06-21',
       'Bengaluru Golf Club'
from public.charities c
where c.slug = 'hope-caddies-foundation'
on conflict do nothing;
