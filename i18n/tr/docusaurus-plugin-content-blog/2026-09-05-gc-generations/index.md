---
title: GC generation'ları
authors: [burak]
tags: [dotnet, memory]
---

CLR'ın yönetilen heap'i neden üç garbage-collection kuşağına (generation) böldüğü ve bunun allocation-yoğun kod yazarken ne anlama geldiği üzerine notlar.

{/* truncate */}

## Kuşakların arkasındaki varsayım

Çoğu obje kısa ömürlüdür: bir request DTO'su, formatlanmış bir log satırı,
bir LINQ ara sonucu — oluşturulur, bir kez kullanılır, gider. Az sayıda obje
— bir cache, bir singleton servis, bir bağlantı havuzu — process'in tüm
ömrü boyunca yaşar. GC, her taramada tüm heap'i taramak yerine onu üç
kuşağa böler ve çabasının neredeyse tamamını en hızlı ölen kuşağa harcar.

| Kuşak | Neyi tutar | Ne sıklıkla toplanır | Maliyet |
|---|---|---|---|
| Gen 0 | her yeni obje | çok sık | ucuz — küçük bölge, hızlı taranır |
| Gen 1 | Gen 0'da hayatta kalanlar | ara sıra | 0 ile 2 arasında bir tampon |
| Gen 2 | Gen 1'de hayatta kalanlar | nadiren | pahalı — tam heap taraması |

`GC.MaxGeneration` her masaüstü/sunucu CLR'ında `2`'dir — Gen 3 yoktur. Bir
obje, hayatta kaldığı her tarama başına tam olarak bir kere terfi eder:
Gen 0 → Gen 1 → Gen 2, daha ileri gitmez.

## Bir terfiyi canlı izlemek

`GC.GetGeneration(obj)`, bir objenin şu an tam olarak hangi kuşakta
olduğunu bildirir. Bir referansı üç açık koleksiyon boyunca canlı tutmak,
merdiveni doğrudan gösterir:

```csharp
var obj = new object();
Console.WriteLine(GC.GetGeneration(obj)); // 0

GC.Collect(0);
Console.WriteLine(GC.GetGeneration(obj)); // 1

GC.Collect(1);
Console.WriteLine(GC.GetGeneration(obj)); // 2

GC.Collect(2);
Console.WriteLine(GC.GetGeneration(obj)); // 2 — Gen 2 son kattır
```

Aynı obje, üç koleksiyon, üç farklı cevap. Terfi, runtime'ın tahmin ettiği
bir sezgisel değil — net bir kural: bulunduğun kuşağın bir taramasından
sağ çık, tam olarak bir üst kuşağa taşın.

## Gen 0'da gerçekte ne yaşar

500.000 kısa ömürlü string oluşturup — her biri üretilip bir kez okunup
hiçbir yerde tutulmadan — `GC.CollectionCount()`'a öncesinde ve sonrasında
bakmak:

```
Gen 0 collections: 6
Gen 1 collections: 0
Gen 2 collections: 0
```

Altı Gen 0 taraması çalıştı. Gen 1 ve Gen 2 hiç çalışmadı, çünkü hiçbir şey
terfi etmeyi gerektirecek kadar hayatta kalmadı. Gen 0'ın bütün amacı bu:
ucuz, sık ve tasarım gereği, içine giren neredeyse hiçbir şey oradan
çıkmaz.

## Karşıt örnek: bir şeyleri canlı tutmak

Tek bir değişkeni değiştir — objeleri atmak yerine bir `List`'te tut — ve
aynı allocation sayısı bu sefer yoğun şekilde terfi eder:

```
Gen 0 collections: 4    Gen 1 collections: 3    Gen 2 collections: 2
Managed memory:    59,897,208 bytes
```

Her tarama, hayatta kalanları yukarı terfi ettirdi — çünkü canlı bir
referans (`list`) onları erişilebilir tutuyordu. Aynı şekilde bir iş
yükü, tam tersi bir sonuç — tek değişken, tarama çalıştığında hâlâ o
objeye işaret eden bir şey olup olmadığı.

## Debug/Release tuzağı

Bunu ölçmek sadece `Release` modda anlamlıdır. `Debug` modda JIT, bir yerel
değişkeni **tüm sözdizimsel kapsamı boyunca** kökte tutar (debugger onu
inceleyebilsin diye), son gerçek kullanımından sonra bile. `Release` modda
ise JIT, bir değişkenin gerçek ömrünü son kullanımında bitirir — yani bir
döngüden sonra bir daha dokunulmayan bir `List`, değişken teknik olarak
hâlâ "kapsamda" olsa bile, sonraki bir `GC.Collect()` tarafından tamamen
toplanabilir. GC davranışını `Debug` modda ölçmek, programının değil,
debugger'ın bir yapaylığını ölçmek demektir.

## Çıkarımlar

- Çalışan bir uygulamada Gen 0 koleksiyonlarının sürekli tetiklenmesi
  normaldir, beklenendir ve ucuzdur.
- Yükselen Gen 2 sayıları asıl araştırılması gereken sinyaldir — bir
  şeyin gerekenden uzun süre tutulduğu anlamına gelir: sınırsız bir cache,
  unutulmuş bir event subscription, sadece büyüyen bir static liste.
- Terfi bir sezgisel değil, katı bir kuraldır: bir taramadan sağ çık, tam
  olarak bir kuşak yukarı çık.
- GC/bellek davranışını her zaman `Release` modda ölç, asla `Debug` modda
  değil.
