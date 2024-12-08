const contactOptions = {
  parse_mode: "Markdown",
  reply_markup: {
    one_time_keyboard: true,
    resize_keyboard: true,
    keyboard: [
      [
        {
          text: "My phone number",
          request_contact: true,
        },
      ],
    ],
  },
};

const locationOption = {
  parse_mode: "Markdown",
  reply_markup: {
    one_time_keyboard: true,
    resize_keyboard: true,
    keyboard: [
      [
        {
          text: "My location",
          request_location: true,
        },
      ],
    ],
  },
};

const startOpitons = {
  reply_markup: JSON.stringify({
    inline_keyboard: [[{ text: "Start", callback_data: "/start" }]],
  }),
};

const gameOptions = {
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [
        {
          text: "1",
          callback_data: "1",
        },
        {
          text: "2",
          callback_data: "2",
        },
        {
          text: "3",
          callback_data: "3",
        },
      ],
      [
        {
          text: "4",
          callback_data: "4",
        },
        {
          text: "5",
          callback_data: "5",
        },
        {
          text: "6",
          callback_data: "6",
        },
      ],
      [
        {
          text: "7",
          callback_data: "7",
        },
        {
          text: "8",
          callback_data: "8",
        },
        {
          text: "9",
          callback_data: "9",
        },
      ],
      [
        {
          text: "0",
          callback_data: "0",
        },
      ],
    ],
  }),
};

const againOptions = {
  reply_markup: JSON.stringify({
    inline_keyboard: [[{ text: "Boshqatdan boshlash", callback_data: "/again" }]],
  }),
};

const homeOptions = {
  reply_markup: JSON.stringify({
    keyboard: [
      [
        {
          text: "Home",
          callback_data: "/home",
        },
      ],
    ],
  }),
};

const removeAllOptions = {
  reply_markup: {
    remove_keyboard: true,
  },
};

export { contactOptions, locationOption, gameOptions, againOptions, homeOptions, removeAllOptions, startOpitons };
