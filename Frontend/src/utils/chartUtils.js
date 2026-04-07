export const generateRandomColors = (num) => {
  const colors = [];
  const baseColors = [
    '#f6ad55', // Orange-400
    '#68d391', // Green-400
    '#fc8181', // Red-400
    '#63b3ed', // Blue-400
    '#a78bfa', // Purple-400
    '#fbd38d', // Yellow-400
    '#81e6d9', // Teal-400
  ];
  for (let i = 0; i < num; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
};