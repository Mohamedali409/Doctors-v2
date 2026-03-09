export const removeSlot = (slots, slotDate, slotTime) => {
  slots[slotDate] = slots[slotDate].filter((e) => e !== slotTime);

  return slots;
};
