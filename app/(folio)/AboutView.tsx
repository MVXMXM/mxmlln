'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

function fanTimeline(root: ParentNode) {
  const albums = root.querySelectorAll('.timelinePhotoAlbum')
  albums.forEach((album) => {
    const photos = album.querySelectorAll<HTMLElement>('.timelinePhoto')
    photos.forEach((photo, index) => {
      const rotation =
        index === 0 ? Math.random() * 21 - 15 : index === 1 ? Math.random() * 12 - 9 : Math.random() * 5
      photo.style.transform = `rotate(${rotation}deg) translate(${80 * index}%, 0px)`
      photo.style.marginTop = '30px'
      if (index === Math.floor(photos.length / 2)) photo.style.zIndex = '500'
    })
  })
}

export function AboutView() {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const stacks = document.querySelector('.AllStacks')
    if (!(stacks instanceof HTMLElement) || !stacks.parentElement) return
    const stage = document.createElement('div')
    stage.className = 'folio-stage'
    const mount = document.createElement('div')
    mount.className = 'folio-about-slot'
    stacks.before(stage)
    stage.append(stacks, mount)
    setSlot(mount)
    return () => {
      stage.before(stacks)
      stage.remove()
      setSlot(null)
    }
  }, [])

  useEffect(() => {
    if (!slot) return
    const root = slot.querySelector('.folio-about')
    if (!root) return
    fanTimeline(root)

    const openLightbox = (
      window as Window & {
        openLightbox?: (media: {
          kind: 'image' | 'video' | 'youtube'
          src: string
          title?: string
          sourceEl?: Element
        }) => boolean
      }
    ).openLightbox

    const onPhotoClick = (event: Event) => {
      const photo = event.currentTarget
      if (!(photo instanceof HTMLImageElement) || !openLightbox) return
      const src = photo.currentSrc || photo.getAttribute('src')
      if (!src) return
      openLightbox({
        kind: 'image',
        src,
        title: photo.getAttribute('alt') || 'Image',
        sourceEl: photo,
      })
    }

    const photos = root.querySelectorAll<HTMLImageElement>('.timelinePhoto')
    photos.forEach((photo) => photo.addEventListener('click', onPhotoClick))
    return () => {
      photos.forEach((photo) => photo.removeEventListener('click', onPhotoClick))
    }
  }, [slot])

  if (!slot) return null

  return createPortal(
    <div className="folio-about">
      <div className="timeline">
        <div className="timelineBlock">
          <div className="timelineRuler">
            <div className="timelineIcon">
              <img src="/assets/icons/baby.svg" width={30} alt="baby" />
            </div>
            <hr style={{ height: '100%', width: 2, border: 'none', backgroundColor: 'rgba(0, 0, 0, 0.075)' }} />
          </div>
          <div className="timelineContent">
            <div className="timelineCopy">
              <div className="BadgeText" style={{ margin: '4px 0px' }}>
                1989 - Y2K
              </div>
              <h2>First steps to first login</h2>
              <p>
                My fascination with the web began on our family computer through a dial-up connection. The first website I hacked together was a showcase for videos of me & my friends skateboarding since YouTube had yet to be invented.
              </p>
            </div>
            <div className="timelinePhotoAlbum">
              <img src="/assets/timeline/Baby.jpeg" className="timelinePhoto" style={{ width: 400 }} alt="" />
            </div>
          </div>
        </div>

        <div className="timelineBlock">
          <div className="timelineRuler">
            <div className="timelineIcon">
              <img src="/assets/icons/grad.svg" width={32} alt="graduation cap" />
            </div>
            <hr style={{ height: '100%', width: 2, border: 'none', backgroundColor: 'rgba(0, 0, 0, 0.075)' }} />
          </div>
          <div className="timelineContent">
            <div className="timelineCopy">
              <div className="BadgeText" style={{ margin: '4px 0px' }}>
                2007 - 2011
              </div>
              <h2>Graphic Design BFA</h2>
              <p>
                To avoid becoming a starving artist, I attended CSULB where I unexpectedly fell in love with design. While there were no UX classes when I entered school, upon my exit it became obvious that I could combine my graphic skills with my technical experience to design for the web.
              </p>
            </div>
            <div className="timelinePhotoAlbum">
              <img src="/assets/id/WestPointHelmet.jpeg" className="timelinePhoto" alt="" />
              <img src="/assets/id/DamnJackals_VinylMock.jpeg" className="timelinePhoto" alt="" />
              <img src="/assets/id/LaborShirt2.jpeg" className="timelinePhoto" alt="" />
            </div>
          </div>
        </div>

        <div className="timelineBlock">
          <div className="timelineRuler">
            <div className="timelineIcon">
              <img src="/assets/icons/wifi.svg" width={24} alt="wifi" />
            </div>
            <hr style={{ height: '100%', width: 2, border: 'none', backgroundColor: 'rgba(0, 0, 0, 0.075)' }} />
          </div>
          <div className="timelineContent" style={{ paddingBottom: 80 }}>
            <div className="timelineCopy">
              <div className="BadgeText" style={{ margin: '4px 0px' }}>
                2012 - 2014
              </div>
              <h2>Agency life</h2>
              <p>
                I began my career working as a Digital Designer at a creative agency that contracted out to companies such as Yelp, Microsoft, Chevrolet, & Choice Hotels. I never got permission to share this work but it was mostly banner ads anyways so perhaps it&apos;s best left on my hard drive.
              </p>
            </div>
          </div>
        </div>

        <div className="timelineBlock">
          <div className="timelineRuler">
            <div className="timelineIcon">
              <img src="/assets/icons/cd.svg" width={30} alt="cd" />
            </div>
            <hr style={{ height: '100%', width: 2, border: 'none', backgroundColor: 'rgba(0, 0, 0, 0.075)' }} />
          </div>
          <div className="timelineContent">
            <div className="timelineCopy">
              <div className="BadgeText" style={{ margin: '4px 0px' }}>
                2014 - 2018
              </div>
              <h2>UIUX @ 8tracks</h2>
              <p>
                I jumped over to San Francisco to help millions of music lovers connect with each other through new tracks. I began work with the marketing team & eventually found myself leading the Product Design efforts until the company met its unfortunate conclusion.
              </p>
            </div>
            <div className="timelinePhotoAlbum">
              <img src="/assets/id/8tracksTape3.jpeg" className="timelinePhoto" alt="" />
              <img src="/assets/img/8tracks_FeaturedDJs.jpg" className="timelinePhoto" alt="" />
              <img src="/assets/id/VinylEyeInsta.jpeg" className="timelinePhoto" alt="" />
            </div>
          </div>
        </div>

        <div className="timelineBlock">
          <div className="timelineRuler">
            <div className="timelineIcon">
              <img src="/assets/icons/cat.svg" width={24} alt="cat" />
            </div>
            <hr style={{ height: '100%', width: 2, border: 'none', backgroundColor: 'rgba(0, 0, 0, 0.075)' }} />
          </div>
          <div className="timelineContent">
            <div className="timelineCopy">
              <div className="BadgeText" style={{ margin: '4px 0px' }}>
                2015 - 2018
              </div>
              <h2>Founder @ Lost Cat™</h2>
              <p>
                In the early days of the e-commerce craze, I spent nights & weekends experimenting with my first long-term side project by building a niche streetwear brand. It began selling at a local NYC skateshop called Labor & eventually found its way onto the racks at the New Museum&apos;s gift shop. Despite the humble success, I decided to close up the e-shop to focus on things more fulfilling than fashion logistics.
              </p>
            </div>
            <div className="timelinePhotoAlbum">
              <img src="/assets/img/Catintosh.jpeg" className="timelinePhoto" alt="" />
              <img src="/assets/timeline/LostCatSweater.gif" className="timelinePhoto" alt="" />
              <img src="/assets/id/LostCatLogos.gif" className="timelinePhoto" alt="" />
            </div>
          </div>
        </div>

        <div className="timelineBlock">
          <div className="timelineRuler">
            <div className="timelineIcon">
              <img src="/assets/icons/pencil.svg" width={24} alt="pencil" />
            </div>
            <hr style={{ height: '100%', width: 2, border: 'none', backgroundColor: 'rgba(0, 0, 0, 0.075)' }} />
          </div>
          <div className="timelineContent">
            <div className="timelineCopy">
              <div className="BadgeText" style={{ margin: '4px 0px' }}>
                2017 - 2018
              </div>
              <h2>Freelance animator</h2>
              <p>
                After regaining my nights & weekends, I began exploring animation by sharing my progress each week on{' '}
                <a href="https://www.instagram.com/p/BYWDfS_FTDn/?next=%2F" target="_blank" style={{ color: 'blue' }}>
                  <u>Instagram</u>
                </a>
                . It caught the attention of some musicians who began hiring me for freelance projects. While the highlight of this era was creating a music video for{' '}
                <a href="https://www.youtube.com/watch?v=BbvRQ7c-8IU" target="_blank" style={{ color: 'blue' }}>
                  <u>Ryuichi Sakamoto</u>
                </a>
                , I found it hard to justify taking on more contracts because in some ways software is much more fun to work on (& tends to pay much better).
              </p>
            </div>
            <div className="timelinePhotoAlbum">
              <img src="/assets/img/Ramen.gif" className="timelinePhoto" alt="" />
              <img src="/assets/img/Ace.gif" className="timelinePhoto" alt="" />
              <img src="/assets/img/Saud.gif" className="timelinePhoto" alt="" />
            </div>
          </div>
        </div>

        <div className="timelineBlock">
          <div className="timelineRuler">
            <div className="timelineIcon">
              <img src="/assets/icons/mic.svg" width={20} alt="mic" />
            </div>
            <hr style={{ height: '100%', width: 2, border: 'none', backgroundColor: 'rgba(0, 0, 0, 0.075)' }} />
          </div>
          <div className="timelineContent">
            <div className="timelineCopy">
              <div className="BadgeText" style={{ margin: '4px 0px' }}>
                2018 - 2024
              </div>
              <h2>Design Lead @ Headliner</h2>
              <p>
                My animation contracts highlighted a problem many audio creators face sharing their content across a web primarily designed for visual discovery, so I joined Headliner&apos;s effort to help podcasters easily share their work by automating supportive asset creation. This was my first experience designing around AI, forcing me to understand the abilities & constraints of NLP, LLMs, & generative image/video models.
              </p>
            </div>
            <div className="timelinePhotoAlbum">
              <img src="/assets/Headliner.gif" className="timelinePhoto" alt="" />
              <img src="/assets/timeline/HeadlinerMobileScreens.png" className="timelinePhoto" alt="" />
              <img src="/assets/VideoFiles.png" className="timelinePhoto" alt="" />
            </div>
          </div>
        </div>

        <div className="timelineBlock">
          <div className="timelineRuler">
            <div className="timelineIcon">
              <img src="/assets/icons/nodes.svg" width={24} alt="nodes" />
            </div>
          </div>
          <div className="timelineContent">
            <div className="timelineCopy">
              <div className="BadgeText" style={{ margin: '4px 0px' }}>
                2025 - 2026
              </div>
              <h2>Founding Designer @ Yutori</h2>
              <p>
                I&apos;m convinced that Generative AI will unrecognizably change software, which tends to subsequently change the world, so I&apos;m building off my work at Headliner by diving into AI UX. It began with a series of articles published in the likes of{' '}
                <a href="https://www.smashingmagazine.com/author/maximillian-piras/" target="_blank" style={{ color: 'blue' }}>
                  <u>Smashing Magazine</u>
                </a>{' '}
                &{' '}
                <a href="https://uxmag.com/contributors/maximillian-piras" target="_blank" style={{ color: 'blue' }}>
                  <u>UX Mag</u>
                </a>
                . Then a series of side projects, such as{' '}
                <a href="https://www.conceptcalculator.ai" target="_blank" style={{ color: 'blue' }}>
                  <u>CC-1 Concept Calculator</u>
                </a>
                . Now I&apos;m working on something new at{' '}
                <a href="https://yutori.com" target="_blank" style={{ color: 'blue' }}>
                  <u>Yutori</u>
                </a>
                . Follow me on{' '}
                <a href="https://x.com/MVXMXM" target="_blank" style={{ color: 'blue' }}>
                  <u>X</u>
                </a>{' '}
                for updates!
              </p>
            </div>
            <div className="timelinePhotoAlbum">
              <img src="/assets/Abstraction.gif" className="timelinePhoto" alt="" />
              <img src="/assets/Algo.png" className="timelinePhoto" alt="" />
              <img src="/assets/CC1.png" className="timelinePhoto" alt="" />
            </div>
          </div>
        </div>
      </div>
    </div>,
    slot,
  )
}
