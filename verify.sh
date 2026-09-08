B="https://upload.wikimedia.org/wikipedia/commons/thumb"
urls=(
"$B/e/e2/Kios_Warung_Makan_Di_Ambal_Kebumen.jpg/900px-Kios_Warung_Makan_Di_Ambal_Kebumen.jpg"
"$B/c/c9/Pedagang_Warung_Makan_Di_Pasar_Klitikan_Di_Kebumen.jpg/900px-Pedagang_Warung_Makan_Di_Pasar_Klitikan_Di_Kebumen.jpg"
"$B/3/3c/Sisi_Selatan_Warung_Makan_Di_Jl.Arumbinang_Kebumen_Jateng_Indonesia.jpg/900px-Sisi_Selatan_Warung_Makan_Di_Jl.Arumbinang_Kebumen_Jateng_Indonesia.jpg"
"$B/e/e9/Maestro_Batik_Tulis_di_Imogiri.jpg/900px-Maestro_Batik_Tulis_di_Imogiri.jpg"
"$B/6/65/Pengrajin_Batik_Sukapura.jpg/900px-Pengrajin_Batik_Sukapura.jpg"
"$B/3/34/Pengrajin_batik_Trusmi_00.jpg/900px-Pengrajin_batik_Trusmi_00.jpg"
"$B/c/c4/Jasa_Penjahit_Di_Jl.Pemuda_Kebumen.jpg/900px-Jasa_Penjahit_Di_Jl.Pemuda_Kebumen.jpg"
"$B/8/8b/Jasa_Penjahit_Di_Pasar_Tumenggungan_Kebumen.jpg/900px-Jasa_Penjahit_Di_Pasar_Tumenggungan_Kebumen.jpg"
"$B/8/89/Bengkel_Cakra_Motor_11.jpg/900px-Bengkel_Cakra_Motor_11.jpg"
"$B/5/52/Bengkel_Jok_Sepeda_Motor_Di_Kebumen_Jateng_Indonesia.jpg/900px-Bengkel_Jok_Sepeda_Motor_Di_Kebumen_Jateng_Indonesia.jpg"
"$B/f/f3/PKL_Pasar_Purbalingga.jpg/900px-PKL_Pasar_Purbalingga.jpg"
"$B/8/84/Rempah_tradisional_di_pasar.jpg/900px-Rempah_tradisional_di_pasar.jpg"
"$B/7/78/Pasar_Ikan_Tradisional_Kedonganan.jpg/900px-Pasar_Ikan_Tradisional_Kedonganan.jpg"
"$B/3/36/Jukung_Pasar_Terapung.jpg/900px-Jukung_Pasar_Terapung.jpg"
)
ok=0; bad=0
for u in "${urls[@]}"; do
  c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 25 -A "ModalinDev/1.0" "$u")
  n=$(basename "$u" | cut -c1-46)
  if [ "$c" = "200" ]; then ok=$((ok+1)); else bad=$((bad+1)); echo "  $c  $n"; fi
  sleep 2
done
echo ""; echo "OK: $ok / $((ok+bad))"
