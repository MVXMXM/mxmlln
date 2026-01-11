"use client"

import React, { JSX } from "react"
import { motion } from "framer-motion"

type TextAnimateProps = {
  children: React.ReactNode
  animation?: "blurIn" | "blurInUp"
  as?: keyof JSX.IntrinsicElements
  className?: string
}

export function TextAnimate({
  children,
  animation = "blurIn",
  as = "span",
  className = "",
}: TextAnimateProps) {
  const Tag = as as React.ElementType;

  // If children is a string, animate per word
  if (typeof children === 'string') {
    const words = children.split(' ');
    const variants = {
      hidden: {
        opacity: 0,
        filter: "blur(10px)",
        y: animation === 'blurInUp' ? 30 : 0,
      },
      visible: {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
      },
    };
    return (
      <Tag className={className} style={{ display: "inline-block", whiteSpace: "normal" }}>
        {words.map((word, i) => (
          <React.Fragment key={i}>
            <motion.span
              initial="hidden"
              animate="visible"
              variants={variants}
              transition={{ duration: 1.2, delay: i * 0.08, ease: [0.4, 0, 0.2, 1] }}
              style={{ display: "inline-block" }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 && ' '}
          </React.Fragment>
        ))}
      </Tag>
    );
  }

  // Otherwise, animate the block as a whole
  const variants = {
    hidden: {
      opacity: 0,
      filter: "blur(10px)",
      y: animation === 'blurInUp' ? 30 : 0,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: { duration: 1.2, delay: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
  };
  return (
    <motion.div initial="hidden" animate="visible" variants={variants} className={className}>
      <Tag>{children}</Tag>
    </motion.div>
  );
} 
