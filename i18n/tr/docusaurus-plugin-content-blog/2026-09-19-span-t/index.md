---
title: Span<T>
authors: [burak]
tags: [dotnet, memory]
---

`Span<T>` üzerine notlar — mevcut belleğe sıfır kopyalamayla açılan bir pencere, ve neden mutlaka stack'te durmak zorunda olduğu.

{/* truncate */}

## Aslında ne olduğu

`Span<T>`, sadece bir bellek başlangıç işaretçisi ve bir uzunluk tutan minik bir struct — kabaca `{ ref T _reference; int _length; }`. Bir string'in, dizinin ya da stack üzerinde ayrılmış bir tamponun bir "penceresini" temsil ediyor, altındaki veriyi hiç kopyalamadan.

## Ölçülmüş: allocation'lı vs allocation'sız parsing

`"1,2,3,...,10"` string'ini 200.000 kere, iki yöntemle parse etmek, `Release` modda:

```
--- string.Split (her parça bir substring, allocate eder) ---
Süre: 72ms
Gen0: 8  Gen1: 0  Gen2: 0

--- ReadOnlySpan<char> ile dilimleme ---
Süre: 28ms
Gen0: 8  Gen1: 0  Gen2: 0   ← değişmedi
```

`Split`, her çağrıda bir `string[]` ve her parça için ayrı bir substring allocate ediyor — çalışma boyunca 2.000.000+ kısa ömürlü allocation. Bir `ReadOnlySpan<char>`'ı dilimlemek (`remaining[..commaIndex]`) hiç allocate etmiyor: dilim, **orijinal** string'in mevcut belleğine işaret eden yeni bir işaretçi + uzunluktan ibaret. `int.Parse` doğrudan bir span kabul ediyor, yani ara bir string hiç oluşturulmuyor.

## Neden mutlaka stack'e zorlanıyor

`Span<T>`, `ref struct` olarak tanımlanmış, ve derleyici katı bir kural uyguluyor: normal bir class'ın field'ı, bir generic type argümanı, box'lanmış bir şey ya da bir koleksiyonda saklanan bir şey olamaz. Kanıt:

```csharp
class Holder
{
    public Span<int> Data;
}
// error CS8345: Field or auto-implemented property cannot be of type 'Span<int>'
// unless it is an instance member of a ref struct.
```

Sebep, bellek güvenliği. Bir `Span<T>`, yönetilen bir objenin **ortasına** işaret edebilir (örneğin bir string'in iç tamponu). .NET'in GC'si, parçalanmayı azaltmak için heap'i periyodik olarak **sıkıştırıyor (compact)** — objeleri taşıyor. GC, bu işlem sırasında stack'te duran işaretçileri zaten takip edip güncelliyor, ama heap'in her yerine dağılmış rastgele interior pointer'lar için aynısını güvenle yapmak çok daha pahalı olurdu. `Span<T>`'i stack'e sınırlamak, sorunu baştan ortadan kaldırıyor: heap'te bayatlayacak bir interior pointer hiç yok.

## Çıkarım

`Span<T>`, "bu veriye bak ama kopyalama" dediğin her yer için var — parsing, string işleme, byte tamponları, hot path'te çok sayıda küçük dilimleme yapan her şey. Stack-only kısıtlaması etrafından dolaşılması gereken bir sınırlama değil — sıfır-kopya garantisini baştan güvenli kılan şey tam olarak bu.
